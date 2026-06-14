import { type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq";
import { createCohere } from "@ai-sdk/cohere";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const PROVIDER_PREFERRED_MODELS: Record<string, string> = {
    anthropic: "claude-haiku-4-5",
    openai: "gpt-5.4-mini",
    gemini: "gemini-3-flash",
    mistral: "mistral-small-latest",
    cohere: "command-a-03-2025",
    groq: "llama-3.3-70b-versatile",
    perplexity: "sonar",
    ai21: "jamba-mini",
};

export function resolveModel(provider: string, requested: string | undefined): string {
    if (requested && requested.length > 0) return requested;
    const preferred = PROVIDER_PREFERRED_MODELS[provider];
    if (preferred) return preferred;
    throw new Error(`No model specified and no default for provider "${provider}"`);
}

export function buildLanguageModel(provider: string, apiKey: string, model: string): LanguageModel {
    switch (provider) {
        case "anthropic":
            return createAnthropic({ apiKey })(model);
        case "openai":
            return createOpenAI({ apiKey })(model);
        case "gemini":
            return createGoogleGenerativeAI({ apiKey })(model);
        case "mistral":
            return createMistral({ apiKey })(model);
        case "groq":
            return createGroq({ apiKey })(model);
        case "cohere":
            return createCohere({ apiKey })(model);
        case "perplexity":
            return createPerplexity({ apiKey })(model);
        case "openrouter":
            return createOpenAICompatible({
                name: "openrouter",
                apiKey,
                baseURL: "https://openrouter.ai/api/v1",
            }).chatModel(model);
        case "ai21":
            return createOpenAICompatible({
                name: "ai21",
                apiKey,
                baseURL: "https://api.ai21.com/studio/v1",
            }).chatModel(model);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}
