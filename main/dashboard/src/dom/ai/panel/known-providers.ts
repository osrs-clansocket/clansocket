export const KNOWN_PROVIDERS: readonly string[] = [
    "anthropic",
    "openai",
    "gemini",
    "groq",
    "mistral",
    "cohere",
    "perplexity",
    "ai21",
    "openrouter",
];

const LABEL_OVERRIDES: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    ai21: "AI21",
    gemini: "Google Gemini",
    cohere: "Cohere",
    mistral: "Mistral",
    groq: "Groq",
    perplexity: "Perplexity",
    openrouter: "OpenRouter",
};

export function providerLabel(name: string): string {
    return LABEL_OVERRIDES[name] ?? name;
}

const PROVIDER_MODELS: Record<string, readonly string[]> = {
    anthropic: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    openai: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.3-codex", "gpt-4.1"],
    gemini: ["gemini-3.1-pro", "gemini-3-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
    groq: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    mistral: [
        "mistral-large-latest",
        "mistral-medium-latest",
        "mistral-small-latest",
        "ministral-8b-latest",
        "ministral-3b-latest",
        "codestral-latest",
        "magistral-medium-latest",
    ],
    cohere: [
        "command-a-03-2025",
        "command-a-vision",
        "command-a-reasoning",
        "command-r-plus-08-2024",
        "command-r-08-2024",
        "command-r7b",
    ],
    perplexity: ["sonar", "sonar-pro", "sonar-reasoning-pro", "sonar-deep-research"],
    ai21: ["jamba-large", "jamba-mini", "jamba-1.5-large", "jamba-1.5-mini"],
    openrouter: [
        "openai/gpt-5.4",
        "anthropic/claude-sonnet-4-6",
        "google/gemini-3.1-pro",
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-r1",
    ],
};

export function modelsForProvider(name: string): readonly string[] {
    return PROVIDER_MODELS[name] ?? [];
}
