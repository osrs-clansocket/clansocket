export interface PromptFile {
    id: string;
    type: "system" | "schema" | "context" | "mode" | "template";
    priority: number;
    always_load: boolean;
    triggers: string[];
    depends_on: string[];
    placeholders: string[];
    auto_load_schemas?: string[];
    content: string;
}

export interface DynamicContext {
    siteAccountId: string;
    pageState: Record<string, unknown> | null;
    history?: { role: "user" | "assistant"; content: string; timestamp?: number }[];
    historyWindow?: number;
}

export type DynamicProvider = (ctx: DynamicContext) => string;
