import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getModel } from "../models";
import { SEOOutput, AIProvider } from "@/types/pipeline";
import { z } from "zod";

const seoSchema = z.object({
  title: z.string().describe("The optimized SEO title for the article"),
  metaDescription: z.string().describe("A compelling meta description"),
  keywords: z.array(z.string()).describe("List of relevant SEO keywords"),
  slug: z.string().describe("URL-friendly slug based on the title"),
});

const seoPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are an SEO expert. Your goal is to optimize content for search engines by providing structured metadata."],
  ["user", "Title: {title}\nSummary: {summary}\n\nProvide the optimized SEO metadata."],
]);

export async function runSEOChain(title: string, summary: string, provider: AIProvider, apiKey: string, baseUrl?: string, modelOverride?: string): Promise<SEOOutput> {
  const model = getModel(provider, "MINI", apiKey, 0.7, baseUrl, modelOverride);
  const structuredModel = model.withStructuredOutput(seoSchema);
  const chain = seoPrompt.pipe(structuredModel);

  const response = await chain.invoke({ title, summary });

  return response as SEOOutput;
}
