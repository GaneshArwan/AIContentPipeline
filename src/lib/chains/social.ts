import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getModel } from "../models";
import { SocialOutput, AIProvider } from "@/types/pipeline";

const socialPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a social media strategist. Your goal is to repurpose long-form content into platform-specific social assets. CRITICAL: Write naturally like a human expert. Absolutely NO 'AI-ish' words or clichés (e.g., 'delve', 'seamless', 'game-changer', 'revolutionize', 'unlock'). Avoid exaggerated, hyperbolic language and overly dramatic adjectives. Keep the tone grounded, authentic, and highly engaging."],
  ["user", "Title: {title}\nContent:\n{content}\n\nProvide the following:\nTwitter Thread:\n- [Tweet 1]\n- [Tweet 2]\n...\n\nLinkedIn Post:\n[Post Content]\n\nEmail Subject Lines:\n- [Subject 1]\n- [Subject 2]\n..."],
]);

export async function runSocialChain(title: string, content: string, provider: AIProvider, apiKey: string, baseUrl?: string, modelOverride?: string): Promise<SocialOutput> {
  const model = getModel(provider, "MINI", apiKey, 0.7, baseUrl, modelOverride);
  const chain = socialPrompt.pipe(model).pipe(new StringOutputParser());

  const response = await chain.invoke({ title, content });

  const twitterThread = response.match(/Twitter Thread:([\s\S]*?)(?=LinkedIn Post:|$)/)?.[1].trim().split("\n").map(p => p.replace("- ", "").trim()).filter(Boolean) || [];
  const linkedInPost = response.match(/LinkedIn Post:([\s\S]*?)(?=Email Subject Lines:|$)/)?.[1].trim() || "";
  const emailSubjectLines = response.match(/Email Subject Lines:([\s\S]*?)$/)?.[1].trim().split("\n").map(p => p.replace("- ", "").trim()).filter(Boolean) || [];

  return { twitterThread, linkedInPost, emailSubjectLines };
}
