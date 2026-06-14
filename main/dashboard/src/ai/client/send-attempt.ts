import { identityClient } from "../../state/identity/identity-client/index.js";
import { history } from "../../dom/ai/send/storage";
import { modesStore } from "../modes-store/index.js";
import { personaStore } from "../persona-store/index.js";
import { profileStore } from "../profile-store";
import { emitChainEvent, parseEvents } from "./sse-parse.js";
import {
    SEND_KIND_USER,
    type AttemptResult,
    type ChatResponse,
    type EventFn,
    type SendOptions,
    type StatusFn,
} from "./types.js";

export interface AttemptParams {
    provider: string;
    config: { apiKey: string; maxTokens?: number; model?: string };
    opts: SendOptions;
    onStatus?: StatusFn;
    onEvent?: EventFn;
    signal?: AbortSignal;
}

interface StreamState {
    finalResponse?: ChatResponse;
    queued?: number;
    streamingNotified: boolean;
    committed: boolean;
}

interface StreamEvent {
    type: string;
    event?: { type: string; payload: Record<string, unknown> };
    queueLength?: number;
    result?: ChatResponse;
    error?: string;
}

const ACK = true;

function buildRequestBody(p: AttemptParams): unknown {
    const { provider, config, opts } = p;
    return {
        text: opts.text,
        mode: opts.mode,
        pageState: opts.pageState,
        chainMode: opts.chainMode,
        kind: opts.kind ?? SEND_KIND_USER,
        actionResults: opts.actionResults,
        priorChainId: opts.priorChainId,
        history,
        profile: profileStore.load(),
        personaOverrides: personaStore.snapshot(),
        modeOverrides: modesStore.snapshot(),
        apiKey: config.apiKey,
        provider,
        model: config.model,
        maxTokens: config.maxTokens,
    };
}

async function postChat(p: AttemptParams): Promise<Response> {
    return identityClient.authedFetch("/api/ai/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(p)),
        signal: p.signal,
    });
}

async function readHttpError(res: Response): Promise<AttemptResult> {
    const text = await res.text().catch(() => "");
    return { httpError: `${res.status}: ${text || res.statusText}` };
}

function handleStreamEvent(
    ev: StreamEvent,
    state: StreamState,
    onStatus: StatusFn | undefined,
    onEvent: EventFn | undefined,
): AttemptResult | undefined {
    if (ev.type === "chain-event" && ev.event) {
        state.committed = ACK;
        emitChainEvent(ev.event, onStatus, onEvent);
    } else if (ev.type === "delta") {
        state.committed = ACK;
        if (!state.streamingNotified && onStatus) {
            onStatus("Streaming...");
            state.streamingNotified = ACK;
        }
    } else if (ev.type === "queued" && typeof ev.queueLength === "number") {
        state.queued = ev.queueLength;
    } else if (ev.type === "done" && ev.result) {
        state.finalResponse = ev.result;
    } else if (ev.type === "error" && typeof ev.error === "string") {
        return { streamError: ev.error, committed: state.committed };
    }
    return undefined;
}

function buildFinalResult(state: StreamState): AttemptResult {
    if (state.queued !== undefined) {
        return { result: { queued: ACK, queueLength: state.queued } };
    }
    if (state.finalResponse) {
        if (state.finalResponse.profileContext) {
            profileStore.applyAiResponse(state.finalResponse.profileContext);
        }
        return { result: state.finalResponse };
    }
    return { streamError: "stream closed without done/error event (check server logs)", committed: state.committed };
}

async function drainStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onStatus: StatusFn | undefined,
    onEvent: EventFn | undefined,
): Promise<AttemptResult> {
    const decoder = new TextDecoder();
    const state: StreamState = { streamingNotified: false, committed: false };
    let buffer = "";
    for (;;) {
        const r = await reader.read();
        if (r.done) break;
        buffer += decoder.decode(r.value, { stream: true });
        const parsed = parseEvents(buffer);
        buffer = parsed.rest;
        for (const ev of parsed.events) {
            const early = handleStreamEvent(ev, state, onStatus, onEvent);
            if (early) return early;
        }
    }
    return buildFinalResult(state);
}

export async function attemptChatWithProvider(p: AttemptParams): Promise<AttemptResult> {
    const res = await postChat(p);
    if (!res.ok || !res.body) return readHttpError(res);
    return drainStream(res.body.getReader(), p.onStatus, p.onEvent);
}
