import type { Actions, AiMessage } from "../../types.js";

export const KIND_CALL_LLM = "call_llm" as const;
export const KIND_DONE = "done" as const;

export interface ChainEvent {
    type: string;
    payload: Record<string, unknown>;
}

export interface FinalResult {
    message: string;
    raw: string;
    actions: Actions | null;
    chainId: string;
    chainContinues: boolean;
    loadedIds: string[];
    pinnedContext: string[];
    profileContext: Record<string, unknown> | null;
    suggestedUserResponse: string | null;
}

export interface ChainStepCallLlm {
    kind: typeof KIND_CALL_LLM;
    chainId: string;
    system: string;
    messages: AiMessage[];
    events: ChainEvent[];
    nextPollSeconds: number | null;
}

export interface ChainStepDone {
    kind: typeof KIND_DONE;
    chainId: string;
    result: FinalResult;
    events: ChainEvent[];
}

export type ChainStepResult = ChainStepCallLlm | ChainStepDone;
