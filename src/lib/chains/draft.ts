import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getModel } from "../models";
import { OutlineOutput, DraftOutput, AIProvider } from "@/types/pipeline";

const draftPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are an elite professional copywriter. Your goal is to write a high-quality, long-form article based on the provided outline. Adhere strictly to the structural requirements, maintain a consistent and authoritative tone, use clear transitions between sections, and format the output exclusively in Markdown. CRITICAL: Write naturally like a human expert. Absolutely NO 'AI-ish' words or clichés (e.g., 'delve', 'explore', 'seamless', 'tapestry', 'in conclusion', 'revolutionize', 'unlock'). Avoid exaggerated, hyperbolic language and overly dramatic adjectives. Do not include conversational filler or meta-commentary."],
  ["user", "Outline:\n{outline}\n\nWrite the full article draft. Ensure each section from the outline is expanded into professional, engaging prose."],
]);

export async function runDraftChain(outline: OutlineOutput, provider: AIProvider, apiKey: string, baseUrl?: string, modelOverride?: string): Promise<DraftOutput> {
  const model = getModel(provider, "INSTANT", apiKey, 0.7, baseUrl, modelOverride);
  const chain = draftPrompt.pipe(model).pipe(new StringOutputParser());

  const outlineStr = `Title: ${outline.title}\n\n${outline.sections.map(s => `Section: ${s.heading}\nPoints: ${s.points.join(", ")}`).join("\n\n")}`;
  const response = await chain.invoke({ outline: outlineStr });

  return { content: response };
}
