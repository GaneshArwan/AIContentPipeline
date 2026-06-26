import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getModel } from "../models";
import { ResearchOutput, OutlineOutput, AIProvider } from "@/types/pipeline";

const outlinePrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a professional content strategist. Your goal is to create a structured article outline based on research data. CRITICAL: Use clear, direct, and grounded language for headings and points. Absolutely NO 'AI-ish' words or clichés (e.g., 'delve', 'explore', 'seamless', 'revolutionize'). Avoid exaggerated or hyperbolic language."],
  ["user", "Topic: {topic}\nResearch Data: {research}\n\nProvide a structured outline with a title and several sections. Each section must have a heading and key points.\nFormat:\nTitle: [Article Title]\n\nSection: [Heading]\n- [Point 1]\n- [Point 2]\n\nSection: [Heading]\n..."],
]);

export async function runOutlineChain(topic: string, research: ResearchOutput, provider: AIProvider, apiKey: string, baseUrl?: string, modelOverride?: string): Promise<OutlineOutput> {
  const model = getModel(provider, "MINI", apiKey, 0.7, baseUrl, modelOverride);
  const chain = outlinePrompt.pipe(model).pipe(new StringOutputParser());

  const researchStr = `Key Points: ${research.keyPoints.join(", ")}\nStats: ${research.statistics.join(", ")}\nSubtopics: ${research.subtopics.join(", ")}`;
  const response = await chain.invoke({ topic, research: researchStr });

  const title = response.match(/Title: (.*)/)?.[1] || "Untitled Article";
  const sections: { heading: string; points: string[] }[] = [];
  
  const sectionMatches = response.split("Section: ").slice(1);
  for (const match of sectionMatches) {
    const lines = match.trim().split("\n");
    const heading = lines[0].trim();
    const points = lines.slice(1).map(p => p.replace("- ", "").trim()).filter(Boolean);
    sections.push({ heading, points });
  }

  return { title, sections };
}
