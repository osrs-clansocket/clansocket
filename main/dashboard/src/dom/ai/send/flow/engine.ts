import { aiClient, type SendOptions } from "../../../../ai/client";
import { executeActions } from "../../../../ai/actions/action-executor/index.js";
import { setThinkingEl, updateThinking } from "../../thinking";
import { addChainEvent } from "../../chain-events";
import { showAuthGate } from "../../panel/auth/gate";
import { recordTurn, type ChainEvent } from "../storage";
import { buildFollowupOptions, buildOptions, showThinking, waitForPageSettle } from "./preflight.js";
import { consumeQueuedDelivery, isQueuedResponse } from "./queue.js";
import {
    AUTH_ERROR_STATUS,
    AUTH_ERROR_TOKEN,
    FOLLOWUP_PLACEHOLDER_TEXT,
    MAX_FOLLOWUP_DEPTH,
    type SendElements,
} from "./types.js";

function isAuthError(message: string): boolean {
    return message === AUTH_ERROR_TOKEN || message.includes(AUTH_ERROR_STATUS);
}

function isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === "AbortError";
}

interface ChainTurnArgs {
    options: SendOptions;
    displayText: string;
    els: SendElements;
    signal: AbortSignal;
    depth: number;
}

async function runChainTurn({ options, displayText, els, signal, depth }: ChainTurnArgs): Promise<void> {
    const events: ChainEvent[] = [];
    const onEvent = (type: string, payload: Record<string, unknown>) => {
        if (type === "append" && consumeQueuedDelivery(els)) {
            events.push({ type, payload });
            return;
        }
        addChainEvent(els.messagesEl, type, payload);
        events.push({ type, payload });
    };
    const userTs = new Date().toISOString();
    const result = await aiClient.send(options, updateThinking, onEvent, signal);
    if (isQueuedResponse(result)) return;
    const response = result;
    const assistantTs = new Date().toISOString();
    recordTurn({ userText: displayText, userTs, response, assistantTs, events });
    if (response.message) {
        els.addMsg({ containerEl: els.messagesEl, text: response.message, type: "ai", raw: response.raw });
    }
    const chainIdForAudit = response.chainId ?? undefined;
    const actionResults = await executeActions(response.actions, { chainId: chainIdForAudit });
    if (els.onResponse) els.onResponse(response);
    if (signal.aborted) return;
    if (!response.chainContinues || actionResults.length === 0 || response.chainId === null) return;
    if (depth >= MAX_FOLLOWUP_DEPTH) {
        els.addMsg({
            containerEl: els.messagesEl,
            text: `[AUTO-LIMIT REACHED] stopped action loop at depth ${depth}`,
            type: "status",
        });
        return;
    }
    await waitForPageSettle();
    if (signal.aborted) return;
    const followup = buildFollowupOptions(actionResults, response.chainId);
    await runChainTurn({
        options: followup,
        displayText: FOLLOWUP_PLACEHOLDER_TEXT,
        els,
        signal,
        depth: depth + 1,
    });
}

export async function executeSend(text: string, els: SendElements, signal: AbortSignal): Promise<void> {
    try {
        await runChainTurn({ options: buildOptions(text), displayText: text, els, signal, depth: 0 });
    } catch (err) {
        if (isAbortError(err)) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (isAuthError(msg)) {
            showAuthGate(els.messagesEl, () => retrySend(text, els));
            return;
        }
        els.addMsg({ containerEl: els.messagesEl, text: msg, type: "error" });
    }
}

export async function queueSend(text: string, els: SendElements): Promise<void> {
    try {
        await aiClient.send(buildOptions(text));
    } catch (err) {
        if (isAbortError(err)) return;
        els.addMsg({
            containerEl: els.messagesEl,
            text: err instanceof Error ? err.message : String(err),
            type: "error",
        });
    }
}

async function retrySend(text: string, els: SendElements): Promise<void> {
    const controller = new AbortController();
    const thinking = showThinking(els);
    await executeSend(text, els, controller.signal);
    thinking.destroy();
    setThinkingEl(null);
}
