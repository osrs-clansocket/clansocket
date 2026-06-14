import type { ChatResponse } from "../../../../ai/client";
import { clearStored, readStored, writeStored } from "../../../../state/persistence";
import { setThinkingEl } from "../../thinking";
import { chainModeStore } from "../chain-mode-store";
import { ROLE_USER } from "../storage";
import { executeSend, queueSend } from "./engine.js";
import { showThinking } from "./preflight.js";
import { handleSlashCommand } from "./preflight.js";
import { pushQueuedUserMsg } from "./queue.js";
import { refreshContinuousBadge, refreshSendButton } from "./send-ui.js";
import type { SendElements, SendState } from "./types.js";

export type { AddMsgFn, SendElements } from "./types.js";

const SUGGESTION_STORAGE_KEY = "ai-suggested-response";

export function wireSend(els: SendElements): void {
    const state: SendState = { inFlight: false, controller: null };
    refreshContinuousBadge(els);
    chainModeStore.onChange(() => refreshContinuousBadge(els));

    const defaultPlaceholder = els.input.placeholder;
    let pendingSuggestion: string | null = readStored<string>(SUGGESTION_STORAGE_KEY) ?? null;
    if (pendingSuggestion !== null) els.input.placeholder = pendingSuggestion;

    const setSuggestion = (value: string): void => {
        pendingSuggestion = value;
        els.input.placeholder = value;
        writeStored(SUGGESTION_STORAGE_KEY, value);
    };
    const clearSuggestion = (): void => {
        if (pendingSuggestion === null) return;
        pendingSuggestion = null;
        els.input.placeholder = defaultPlaceholder;
        clearStored(SUGGESTION_STORAGE_KEY);
    };

    const baseOnResponse = els.onResponse;
    const wrappedEls: SendElements = {
        ...els,
        onResponse: (res: ChatResponse): void => {
            if (typeof res.suggestedUserResponse === "string" && res.suggestedUserResponse.length > 0) {
                setSuggestion(res.suggestedUserResponse);
            }
            if (baseOnResponse) baseOnResponse(res);
        },
    };

    const fireAbort = (): void => {
        if (state.controller) state.controller.abort();
        state.controller = null;
        state.inFlight = false;
        refreshSendButton(els, state);
    };

    const doSend = async (): Promise<void> => {
        const text = els.input.value.trim();
        if (!text) {
            if (state.inFlight) fireAbort();
            return;
        }
        if (handleSlashCommand(text, els)) {
            els.input.value = "";
            refreshSendButton(els, state);
            els.input.focus();
            return;
        }
        els.input.value = "";
        if (state.inFlight) {
            pushQueuedUserMsg(els, text);
            refreshSendButton(els, state);
            await queueSend(text, wrappedEls);
            return;
        }
        els.addMsg({ containerEl: els.messagesEl, text, type: ROLE_USER });
        state.controller = new AbortController();
        state.inFlight = true;
        refreshSendButton(els, state);
        const thinking = showThinking(els);
        await executeSend(text, wrappedEls, state.controller.signal);
        thinking.destroy();
        setThinkingEl(null);
        state.controller = null;
        state.inFlight = false;
        refreshSendButton(els, state);
        els.input.focus();
    };

    els.sendBtn.addEventListener("click", doSend);
    els.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            doSend();
            return;
        }
        if (e.key === "ArrowRight" && pendingSuggestion !== null && els.input.value.length === 0) {
            e.preventDefault();
            els.input.value = pendingSuggestion;
            els.input.setSelectionRange(els.input.value.length, els.input.value.length);
            clearSuggestion();
            refreshSendButton(els, state);
        }
    });
    els.input.addEventListener("input", () => {
        refreshSendButton(els, state);
    });
}
