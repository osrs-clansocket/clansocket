export interface ChainStepQuery {
    db: string;
    sql: string;
    rows: number | null;
    error?: string;
}

export interface ChainStep {
    step: number;
    loadedContext: string[];
    reads: string[];
    queries: ChainStepQuery[];
    recap: Record<string, string> | null;
    message: string;
    learning: string;
}

export interface Chain {
    id: string;
    instruction: string;
    mode: string;
    startedAt: number;
    completedAt: number | null;
    steps: ChainStep[];
    totalApplied: number;
    totalRejected: number;
}

export const HISTORY_LIMIT = 50;
export const ACTIVE_SLICE = 3;
