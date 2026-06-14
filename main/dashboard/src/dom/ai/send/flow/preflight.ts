import { createInstance, div, type Instance } from "../../../factory";
import { SEND_KIND_ACTION_FEEDBACK, type SendOptions } from "../../../../ai/client";
import { collectDomState } from "../../../../ai/dom-state";
import type { ActionResult } from "../../../../ai/actions/action-types.js";
import { randomIdlePhrase, setThinkingEl, updateThinking } from "../../thinking";
import { chainModeStore, type ChainMode } from "../chain-mode-store";
import { getMode } from "../storage";
import {
    FOLLOWUP_PLACEHOLDER_TEXT,
    PAGE_SETTLE_MS,
    SLASH_CONT_LONG,
    SLASH_CONT_SHORT,
    SLASH_CONT_SHORT_SPACE,
    type SendElements,
} from "./types.js";
import { AI_BAR_MSG_CLASS, AI_BAR_MSG_THINKING_CLASS } from "../../../../shared/constants/ai-bar-constants.js";

export function showThinking(els: SendElements): Instance {
    const inst = div({ classes: [AI_BAR_MSG_CLASS, AI_BAR_MSG_THINKING_CLASS], context: null, meta: null });
    createInstance(els.messagesEl).addChild(inst);
    setThinkingEl(inst.el);
    updateThinking(randomIdlePhrase());
    return inst;
}

export function buildOptions(text: string): SendOptions {
    const pageState = collectDomState();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const stamped = `[USER LOCAL TIME: ${new Date().toLocaleString()} (${tz})] ${text}`;
    return { text: stamped, mode: getMode(), pageState, chainMode: chainModeStore.get() };
}

export function buildFollowupOptions(results: ActionResult[], priorChainId: string): SendOptions {
    return {
        text: FOLLOWUP_PLACEHOLDER_TEXT,
        mode: getMode(),
        pageState: collectDomState(),
        chainMode: chainModeStore.get(),
        kind: SEND_KIND_ACTION_FEEDBACK,
        actionResults: results,
        priorChainId,
    };
}

export function waitForPageSettle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, PAGE_SETTLE_MS));
}

function extractSlashArg(lower: string): string | null {
    if (lower.startsWith(SLASH_CONT_LONG)) return lower.slice(SLASH_CONT_LONG.length).trim();
    if (lower.startsWith(SLASH_CONT_SHORT_SPACE)) return lower.slice(SLASH_CONT_SHORT_SPACE.length).trim();
    if (lower === SLASH_CONT_SHORT) return "";
    return null;
}

export function handleSlashCommand(raw: string, els: SendElements): boolean {
    const arg = extractSlashArg(raw.toLowerCase().trim());
    if (arg === null) return false;
    let next: ChainMode;
    if (arg === "on") next = "continuous";
    else if (arg === "off") next = "reactive";
    else next = chainModeStore.get() === "reactive" ? "continuous" : "reactive";
    chainModeStore.set(next);
    els.addMsg({ containerEl: els.messagesEl, text: `chain mode → ${next}`, type: "status" });
    return true;
}
