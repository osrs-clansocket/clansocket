import {
    applyEffects,
    code,
    createInstance,
    details,
    div,
    onceEffect,
    pre,
    summary,
    type Instance,
} from "../../factory";
import { renderMarkdown, highlightCode, stripCodeFences } from "../../../ai/markdown";
import { shouldAutoExpand } from "./layout/bar-height.js";
import { scrollToBottomCoalesced } from "./layout/scroll-to-bottom.js";
import {
    AI_BAR_CLASS,
    AI_BAR_EXPANDED_CLASS,
    AI_BAR_HISTORY_CLASS,
    AI_BAR_MSG_CLASS,
    AI_BAR_MSG_CONTENT_CLASS,
    AI_BAR_RAW_CLASS,
} from "../../../shared/constants/ai-bar-constants.js";
import { SYNTAX_LANGUAGE_JSON_CLASS } from "../../../shared/constants/syntax-highlight-constants.js";

const SCROLL_DELAY_MS = 350;
const SCROLL_PAD_PX = 8;

type MessageType = "user" | "ai" | "error" | "status";
const MSG_AI: MessageType = "ai";

function buildRawCode(raw: string): Instance {
    const node = code({ classes: [SYNTAX_LANGUAGE_JSON_CLASS], context: null, meta: null });
    try {
        const pretty = JSON.stringify(JSON.parse(stripCodeFences(raw)), null, 2);
        node.setHTML(highlightCode(pretty, "json"));
    } catch {
        node.setText(stripCodeFences(raw));
    }
    return node;
}

function scrollDetailsIntoView(msg: Instance, det: HTMLDetailsElement): void {
    if (!det.open) return;
    const scrollParent = msg.el.closest<HTMLElement>(`.${AI_BAR_HISTORY_CLASS}`);
    if (!scrollParent) return;
    const overflow = det.getBoundingClientRect().bottom - scrollParent.getBoundingClientRect().bottom;
    if (overflow > 0) scrollParent.scrollTop += overflow + SCROLL_PAD_PX;
}

function addRawDetails(msg: Instance, raw: string): void {
    const det = details({ classes: [AI_BAR_RAW_CLASS], context: "expand the raw AI response", meta: ["disclosure"] }, [
        summary({ text: "Raw response", context: null, meta: null }),
        pre({ classes: [SYNTAX_LANGUAGE_JSON_CLASS], context: null, meta: null }, [buildRawCode(raw)]),
    ]) as Instance<HTMLDetailsElement>;
    det.el.addEventListener("toggle", () => {
        scrollDetailsIntoView(msg, det.el);
        if (det.el.open) {
            const body = det.el.querySelector<HTMLElement>(":scope > pre");
            if (body) applyEffects(body, { name: "fade-in", once: true });
        }
    });
    msg.addChild(det);
}

function addAiMessage(msg: Instance, text: string, raw?: string, deepLink?: string): void {
    const content = div({ classes: [AI_BAR_MSG_CONTENT_CLASS], context: null, meta: null }).setHTML(
        renderMarkdown(text, deepLink ?? null),
    );
    msg.addChild(content);
    if (raw && raw !== text) addRawDetails(msg, raw);
}

function ensureExpanded(container: HTMLElement): void {
    const bar = container.closest(`.${AI_BAR_CLASS}`);
    if (bar && !bar.classList.contains(AI_BAR_EXPANDED_CLASS) && shouldAutoExpand()) {
        bar.classList.add(AI_BAR_EXPANDED_CLASS);
    }
    const scrollParent = (container.closest<HTMLElement>(`.${AI_BAR_HISTORY_CLASS}`) ?? container) as HTMLElement;
    scrollToBottomCoalesced(scrollParent);
    setTimeout(() => scrollToBottomCoalesced(scrollParent), SCROLL_DELAY_MS);
}

interface AddMessageOpts {
    containerEl: HTMLElement;
    text: string;
    type: MessageType;
    raw?: string;
    deepLink?: string;
}

function addMessage({ containerEl, text, type, raw, deepLink }: AddMessageOpts): HTMLElement {
    const container = createInstance(containerEl);
    const msg = div({
        classes: [AI_BAR_MSG_CLASS, `${AI_BAR_MSG_CLASS}--${type}`],
        effects: onceEffect("rise"),
        context: null,
        meta: null,
    });
    if (type === MSG_AI) addAiMessage(msg, text, raw, deepLink);
    else msg.setText(text);
    container.addChild(msg);
    ensureExpanded(containerEl);
    return msg.el;
}

export { addMessage };
export type { MessageType };
