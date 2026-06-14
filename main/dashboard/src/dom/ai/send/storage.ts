import type { AiMessage, ChatResponse } from "../../../ai/client";

type Role = AiMessage["role"];
type ChainEvent = { type: string; payload: Record<string, unknown> };

const ROLE_USER = "user" as const;
const ROLE_ASSISTANT = "assistant" as const;
const HISTORY_KEY = "varez_chat_history";
const DISPLAY_KEY = "varez_chat_display";

interface DisplayMessage {
    role: Role;
    content: string;
    raw?: string;
    events?: ChainEvent[];
    timestamp?: string;
    deepLink?: string;
}

function loadHistory(): AiMessage[] {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function loadDisplay(): DisplayMessage[] {
    try {
        const data = localStorage.getItem(DISPLAY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

const history: AiMessage[] = loadHistory();
const displayHistory: DisplayMessage[] = loadDisplay();
let currentMode = "guide";

function getMode(): string {
    return currentMode;
}

function setMode(mode: string): void {
    currentMode = mode;
}

function saveAll(): void {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(displayHistory));
}

function assignTriple<T>(target: T, role: Role, content: string, timestamp: string): T {
    (target as Record<string, unknown>).role = role;
    (target as Record<string, unknown>).content = content;
    (target as Record<string, unknown>).timestamp = timestamp;
    return target;
}

function makeAiMessage(role: Role, content: string, timestamp: string): AiMessage {
    return assignTriple({} as AiMessage, role, content, timestamp);
}

function makeDisplay(role: Role, content: string, timestamp: string, extra?: Partial<DisplayMessage>): DisplayMessage {
    return assignTriple({ ...(extra ?? {}) } as DisplayMessage, role, content, timestamp);
}

interface TurnData {
    userText: string;
    userTs: string;
    response: ChatResponse;
    assistantTs: string;
    events: ChainEvent[];
}

function recordTurn(data: TurnData): void {
    const { userText, userTs, response, assistantTs, events } = data;
    history.push(makeAiMessage(ROLE_USER, userText, userTs));
    history.push(makeAiMessage(ROLE_ASSISTANT, response.message, assistantTs));
    displayHistory.push(makeDisplay(ROLE_USER, userText, userTs));
    if (events.length > 0) displayHistory.push(makeDisplay(ROLE_ASSISTANT, "", assistantTs, { events }));
    displayHistory.push(
        makeDisplay(ROLE_ASSISTANT, response.message, assistantTs, {
            raw: response.raw,
            deepLink: window.location.pathname,
        }),
    );
    saveAll();
}

export { history, displayHistory, getMode, setMode, recordTurn, ROLE_USER };
export type { DisplayMessage, ChainEvent };
