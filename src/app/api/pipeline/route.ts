import { NextRequest, NextResponse } from "next/server";
import { runResearchChain } from "@/lib/chains/research";
import { runOutlineChain } from "@/lib/chains/outline";
import { runDraftChain } from "@/lib/chains/draft";
import { runSEOChain } from "@/lib/chains/seo";
import { runSocialChain } from "@/lib/chains/social";
import { z } from "zod";

// Basic In-Memory Rate Limiter (Mitigation for Item 28)
// Note: In a fully distributed serverless environment (like Vercel), this memory is isolated per function instance.
// For production scale, replace this with Vercel KV (@upstash/ratelimit) or Cloudflare WAF rate limiting.
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 10; // 10 requests
const RATE_LIMIT_WINDOW = 60 * 1000; // per 1 minute

export const dynamic = "force-dynamic";

const providerSchema = z.enum(["gemini", "openai", "anthropic", "local"]);

const PipelineRequestSchema = z.object({
  topic: z.string().max(200).optional(),
  context: z.string().max(2000).optional(),
  step: z.enum(["research", "outline", "draft", "seo", "social"]).optional(),
  input: z.unknown().optional(),
  apiKeys: z.record(providerSchema, z.string()).optional(),
  modelOverrides: z.record(providerSchema, z.string()).optional(),
  stepProviders: z.record(z.string(), providerSchema),
  localBaseUrl: z.string().url().optional().or(z.literal("")),
});

function sanitizeSensitiveData(text: string): string {
  const apiKeyRegex = /(sk-[a-zA-Z0-9_-]{15,}|sk-ant-[a-zA-Z0-9_-]{15,}|AIza[a-zA-Z0-9_-]{15,})/g;
  return text.replace(apiKeyRegex, "[REDACTED_KEY]");
}

export async function POST(req: NextRequest) {
  try {
    // --- Rate Limiting Start ---
    // Try to get IP from x-forwarded-for (Vercel) or fallback to a default
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Clean up old entries to prevent memory leak
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.timestamp < windowStart) {
        rateLimitMap.delete(key);
      }
    }

    const currentRecord = rateLimitMap.get(ip);
    
    if (!currentRecord || currentRecord.timestamp < windowStart) {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    } else {
      if (currentRecord.count >= RATE_LIMIT) {
        console.warn(`[API] Rate limit exceeded for IP: ${ip}`);
        return NextResponse.json({ error: "Too Many Requests. Please wait a minute before trying again." }, { status: 429 });
      }
      rateLimitMap.set(ip, { count: currentRecord.count + 1, timestamp: currentRecord.timestamp });
    }
    // --- Rate Limiting End ---

    const correlationId = Math.random().toString(36).substring(2, 10);
    console.log(`[API:${correlationId}] Pipeline request received from ${ip}`);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: "Invalid request body format" }, { status: 400 });
    }

    const parsedRequest = PipelineRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsedRequest.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { topic, context, step, input, apiKeys, modelOverrides, stepProviders, localBaseUrl } = parsedRequest.data;

    if (!topic && !step) {
      return NextResponse.json({ error: "Topic or Step is required" }, { status: 400 });
    }

    // SSRF Protection (Item 23)
    if (localBaseUrl) {
      try {
        const url = new URL(localBaseUrl);
        const hostname = url.hostname.toLowerCase();
        
        // 1. Block loopback and standard hostnames
        if (
          hostname === 'localhost' ||
          hostname === 'loopback' ||
          hostname === '[::1]' ||
          hostname === '0.0.0.0'
        ) {
          console.warn(`[API:${correlationId}] SSRF attempt blocked: ${hostname}`);
          return NextResponse.json({ error: "SSRF Protection: Access to loopback addresses is forbidden." }, { status: 403 });
        }

        // 2. Block private and loopback IPv4 ranges:
        // - 127.0.0.0/8 (Loopback)
        // - 10.0.0.0/8 (Private)
        // - 172.16.0.0/12 (Private)
        // - 192.168.0.0/16 (Private)
        // - 169.254.0.0/16 (Link-Local / AWS Metadata)
        // - 100.64.0.0/10 (Carrier-grade NAT)
        const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const match = hostname.match(ipv4Pattern);
        if (match) {
          const octet1 = parseInt(match[1], 10);
          const octet2 = parseInt(match[2], 10);
          
          if (
            octet1 === 127 || // loopback
            octet1 === 10 ||  // private class A
            (octet1 === 172 && octet2 >= 16 && octet2 <= 31) || // private class B
            (octet1 === 192 && octet2 === 168) || // private class C
            (octet1 === 169 && octet2 === 254) || // link-local
            (octet1 === 100 && octet2 >= 64 && octet2 <= 127) || // CGNAT
            octet1 === 0 // local network
          ) {
            console.warn(`[API:${correlationId}] SSRF attempt blocked for IP: ${hostname}`);
            return NextResponse.json({ error: "SSRF Protection: Access to internal/private network IPs is strictly forbidden." }, { status: 403 });
          }
        }
      } catch {
        return NextResponse.json({ error: "Invalid localBaseUrl format." }, { status: 400 });
      }
    }

    const encoder = new TextEncoder();
    const signal = req.signal;

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (stepName: string, status: string, data?: unknown) => {
          const event = `data: ${JSON.stringify({ step: stepName, status, data })}\n\n`;
          controller.enqueue(encoder.encode(event));
        };

        const checkCanceled = () => {
          if (signal.aborted) {
            throw new Error("Pipeline canceled by user");
          }
        };

        const getProviderDetails = (stepName: string) => {
          const provider = stepProviders[stepName];
          if (!provider) throw new Error(`Provider not configured for step: ${stepName}`);
          const apiKey = apiKeys?.[provider] || "";
          const modelOverride = modelOverrides?.[provider] || "";
          if (provider !== 'local' && !apiKey) {
            throw new Error(`API Key is required for provider: ${provider} (step: ${stepName}). This application uses a Client-Side BYOK architecture.`);
          }
          return { provider, apiKey, modelOverride };
        };

        try {
          checkCanceled();

          if (!step) {
            // Full sequence logic
            const { provider: rProvider, apiKey: rApiKey, modelOverride: rModel } = getProviderDetails('research');
            const res = await runResearchChain(topic || "", rProvider, rApiKey, context, localBaseUrl, rModel);
            sendEvent("research", "completed", res);
            
            const { provider: oProvider, apiKey: oApiKey, modelOverride: oModel } = getProviderDetails('outline');
            const out = await runOutlineChain(topic || "", res, oProvider, oApiKey, localBaseUrl, oModel);
            sendEvent("outline", "completed", out);
            
            const { provider: dProvider, apiKey: dApiKey, modelOverride: dModel } = getProviderDetails('draft');
            const dra = await runDraftChain(out, dProvider, dApiKey, localBaseUrl, dModel);
            sendEvent("draft", "completed", dra);
            
            const { provider: sProvider, apiKey: sApiKey, modelOverride: sModel } = getProviderDetails('seo');
            const seo = await runSEOChain(out.title, dra.content.slice(0, 2000), sProvider, sApiKey, localBaseUrl, sModel);
            sendEvent("seo", "completed", seo);
            
            const { provider: socProvider, apiKey: socApiKey, modelOverride: socModel } = getProviderDetails('social');
            const soc = await runSocialChain(out.title, dra.content, socProvider, socApiKey, localBaseUrl, socModel);
            sendEvent("social", "completed", soc);
          } else {
            // Single step execution validation
            if (!input || typeof input !== 'object') {
              throw new Error("Input data is required for single step execution");
            }

            const { provider, apiKey, modelOverride } = getProviderDetails(step);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const inputData = input as any;
            switch(step) {
              case 'research': 
                const r = await runResearchChain(inputData.topic || topic || "", provider, apiKey, inputData.context || context, localBaseUrl, modelOverride);
                sendEvent("research", "completed", r);
                break;
              case 'outline':
                if (!inputData.research) throw new Error("Research data missing for outline step");
                const o = await runOutlineChain(inputData.topic || topic || "", inputData.research, provider, apiKey, localBaseUrl, modelOverride);
                sendEvent("outline", "completed", o);
                break;
              case 'draft':
                if (!inputData.outline) throw new Error("Outline data missing for draft step");
                const d = await runDraftChain(inputData.outline, provider, apiKey, localBaseUrl, modelOverride);
                sendEvent("draft", "completed", d);
                break;
              case 'seo':
                if (!inputData.title || !inputData.summary) throw new Error("Title or Summary missing for SEO step");
                const s = await runSEOChain(inputData.title, inputData.summary, provider, apiKey, localBaseUrl, modelOverride);
                sendEvent("seo", "completed", s);
                break;
              case 'social':
                if (!inputData.title || !inputData.content) throw new Error("Title or Content missing for social step");
                const soc = await runSocialChain(inputData.title, inputData.content, provider, apiKey, localBaseUrl, modelOverride);
                sendEvent("social", "completed", soc);
                break;
              default:
                throw new Error(`Unknown step: ${step}`);
            }
          }

          controller.close();
        } catch (error: unknown) {
          const rawErrorMessage = error instanceof Error ? error.message : "Unknown error";
          const errorMessage = sanitizeSensitiveData(rawErrorMessage);
          if (signal.aborted || errorMessage === "Pipeline canceled by user") {
            console.log(`[API:${correlationId}] Pipeline aborted`);
          } else {
            console.error(`[API:${correlationId}] Pipeline error:`, errorMessage);
            const errorEvent = `data: ${JSON.stringify({ error: errorMessage, correlationId })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text-event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    const rawErrorMessage = error instanceof Error ? error.message : "Unknown global error";
    const errorMessage = sanitizeSensitiveData(rawErrorMessage);
    console.error(`[API:Global] Critical Error:`, errorMessage);
    return NextResponse.json({ error: errorMessage, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
