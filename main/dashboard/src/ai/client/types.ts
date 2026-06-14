import type { Actions, ActionResult } from "../actions/action-types.js";

export interface AiMessage {
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
}

export interface ChatResponse {
    message: string;
    raw: string;
    actions: Actions | null;
    chainId: string | null;
    chainContinues: boolean;
    loadedIds: string[];
    pinnedContext: string[];
    profileContext: Record<string, unknown> | null;
    suggestedUserResponse: string | null;
}

export interface QueuedResponse {
    queued: true;
    queueLength: number;
}

export const SEND_KIND_USER = "user" as const;
export const SEND_KIND_ACTION_FEEDBACK = "action-feedback" as const;
export type SendKind = typeof SEND_KIND_USER | typeof SEND_KIND_ACTION_FEEDBACK;

export interface SendOptions {
    text: string;
    mode: string;
    pageState: Record<string, unknown> | null;
    chainMode?: string;
    kind?: SendKind;
    actionResults?: ActionResult[];
    priorChainId?: string;
}

export type SendResult = ChatResponse | QueuedResponse;
export type StatusFn = (status: string) => void;
export type EventFn = (type: string, payload: Record<string, unknown>) => void;

export interface ServerEvent {
    type: string;
    event?: { type: string; payload: Record<string, unknown> };
    delta?: string;
    result?: ChatResponse;
    queueLength?: number;
    error?: string;
}

export interface AttemptResult {
    result?: SendResult;
    httpError?: string;
    streamError?: string;
    committed?: boolean;
}
