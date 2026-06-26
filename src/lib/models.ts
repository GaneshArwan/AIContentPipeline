import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { AIProvider } from "@/types/pipeline";

export const MODELS = {
  gemini: {
    MINI: "gemini-3.1-flash-lite",
    INSTANT: "gemini-3-flash-preview",
  },
  openai: {
    MINI: "gpt-4o-mini",
    INSTANT: "gpt-4o",
  },
  anthropic: {
    MINI: "claude-3-haiku-20240307",
    INSTANT: "claude-3-5-sonnet-20240620",
  },
  local: {
    MINI: "llama3.2:3b",
    INSTANT: "llama3.1:8b",
  }
};

/**
 * Returns a configured model based on the selected provider.
 * In the Client-Side BYOK architecture, the apiKey must be provided 
 * from the client request and is never stored on the server.
 */
export const getModel = (
  provider: AIProvider, 
  modelTier: 'MINI' | 'INSTANT', 
  apiKey: string, 
  temperature = 0.7,
  baseUrl?: string,
  modelOverride?: string
) => {
  const modelName = modelOverride?.trim() || MODELS[provider][modelTier];

  switch (provider) {
    case 'gemini':
      return new ChatGoogleGenerativeAI({
        model: modelName,
        temperature,
        apiKey: apiKey,
        maxOutputTokens: 4000,
      });
    case 'openai':
      return new ChatOpenAI({
        modelName: modelName,
        temperature,
        openAIApiKey: apiKey,
        maxTokens: 4000,
      });
    case 'anthropic':
      return new ChatAnthropic({
        modelName: modelName,
        temperature,
        anthropicApiKey: apiKey,
        maxTokens: 4000,
      });
    case 'local':
      if (!baseUrl) {
        throw new Error("Local Base URL is required for the local provider.");
      }
      return new ChatOpenAI({
        modelName: modelName,
        temperature,
        openAIApiKey: apiKey || "not-needed",
        configuration: {
          baseURL: baseUrl,
        },
        maxTokens: 4000,
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};
