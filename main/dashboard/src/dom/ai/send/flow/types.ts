import type { ChatResponse } from "../../../../ai/client";

export type MessageType = "user" | "ai" | "error" | "status";
export interface AddMsgArgs {
    containerEl: HTMLElement;
    text: string;
    type: MessageType;
    raw?: string;
    deepLink?: string;
}
export type AddMsgFn = (args: AddMsgArgs) => HTMLElement;

export interface SendElements {
    input: HTMLInputElement;
    sendBtn: HTMLButtonElement;
    statusEl: HTMLElement;
    messagesEl: HTMLElement;
    addMsg: AddMsgFn;
    onResponse?: (res: ChatResponse) => void;
}

export interface SendState {
    inFlight: boolean;
    controller: AbortController | null;
}

export const AUTH_ERROR_TOKEN = "no device token";
export const AUTH_ERROR_STATUS = "401";
export const STOP_LABEL = "Stop";
export const SEND_LABEL = "Send";
export const STOP_CLASS = "ai-bar__send--stop";
export const CONTINUOUS_CLASS = "ai-bar--continuous";
export const QUEUED_CLASS = "ai-bar__msg--user-queued";
export const DELIVERED_CLASS = "ai-bar__msg--user-delivered";
export const SLASH_CONT_LONG = "/continuous";
export const SLASH_CONT_SHORT_SPACE = "/c ";
export const SLASH_CONT_SHORT = "/c";
export const MAX_FOLLOWUP_DEPTH = 10;
export const PAGE_SETTLE_MS = 250;
export const FOLLOWUP_PLACEHOLDER_TEXT = "(dom action feedback)";
