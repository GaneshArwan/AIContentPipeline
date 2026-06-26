import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getModel } from "../models";
import { ResearchOutput, AIProvider } from "@/types/pipeline";

const researchPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a professional researcher. Your goal is to provide key points, statistics, and subtopics for a given topic."],
  ["user", "Topic: {topic}\nContext: {context}\n\nProvide the research in the following format:\nKey Points:\n- [point]\n\nStatistics:\n- [stat]\n\nSubtopics:\n- [subtopic]"],
]);

export async function runResearchChain(topic: string, provider: AIProvider, apiKey: string, context?: string, baseUrl?: string, modelOverride?: string): Promise<ResearchOutput> {
  const model = getModel(provider, "MINI", apiKey, 0.7, baseUrl, modelOverride);
  const chain = researchPrompt.pipe(model).pipe(new StringOutputParser());

  const response = await chain.invoke({ topic, context: context || "None" });

  const keyPoints = response.match(/Key Points:([\s\S]*?)(?=Statistics:|$)/)?.[1].trim().split("\n").map(p => p.replace("- ", "").trim()).filter(Boolean) || [];
  const statistics = response.match(/Statistics:([\s\S]*?)(?=Subtopics:|$)/)?.[1].trim().split("\n").map(p => p.replace("- ", "").trim()).filter(Boolean) || [];
  const subtopics = response.match(/Subtopics:([\s\S]*?)$/)?.[1].trim().split("\n").map(p => p.replace("- ", "").trim()).filter(Boolean) || [];

  return { keyPoints, statistics, subtopics };
}
