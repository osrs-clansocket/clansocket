import { createInstance, div, onceEffect, pre, span, type Instance } from "../../factory";
import { labelFor, TYPE_CHAIN, summaryLine, hasDetail, detailContent } from "./summaries";
import type { Payload } from "./summaries";
import { renderMarkdown } from "../../../ai/markdown";
import { buildEventBody, lazyDetails } from "./event-bodies";
import { shouldAutoExpand } from "../panel/layout/bar-height.js";
import { scrollToBottomCoalesced } from "../panel/layout/scroll-to-bottom.js";
import {
    AI_BAR_CHAIN_BODY_CLASS,
    AI_BAR_CHAIN_LABEL_CLASS,
    AI_BAR_CLASS,
    AI_BAR_EVENT_BODY_CLASS,
    AI_BAR_EVENT_CLASS,
    AI_BAR_EVENT_CODE_CLASS,
    AI_BAR_EVENT_HEADER_CLASS,
    AI_BAR_EVENT_LABEL_CLASS,
    AI_BAR_EXPANDED_CLASS,
    AI_BAR_HISTORY_CLASS,
    AI_BAR_MSG_CHAIN_CLASS,
    AI_BAR_MSG_CLASS,
    AI_BAR_MSG_THINKING_CLASS,
} from "../../../shared/constants/ai-bar-constants.js";

const TYPE_CONTINUATION = "continuation";
const THINKING_SELECTOR = `.${AI_BAR_MSG_THINKING_CLASS}`;

function scrollToBottom(container: HTMLElement): void {
    const bar = container.closest(`.${AI_BAR_CLASS}`);
    if (bar && shouldAutoExpand()) bar.classList.add(AI_BAR_EXPANDED_CLASS);
    const scrollParent = container.closest<HTMLElement>(`.${AI_BAR_HISTORY_CLASS}`) ?? container;
    scrollToBottomCoalesced(scrollParent);
}

function insertAboveThinking(containerEl: HTMLElement, el: HTMLElement): void {
    const container = createInstance(containerEl);
    const thinking = containerEl.querySelector<HTMLElement>(THINKING_SELECTOR);
    if (thinking && thinking.parentElement === containerEl) {
        container.addBefore(el, thinking);
    } else {
        container.addChild(el);
    }
}

function createDetails(getContent: () => string): Instance {
    return lazyDetails(
        () => pre({ classes: [AI_BAR_EVENT_CODE_CLASS], text: getContent(), context: null, meta: null }),
        "expand the raw event payload",
    );
}

function renderChainMessage(container: HTMLElement, payload: Payload): void {
    const msg = div(
        {
            classes: [AI_BAR_MSG_CLASS, AI_BAR_MSG_CHAIN_CLASS],
            effects: onceEffect("rise"),
            context: null,
            meta: null,
        },
        [
            span({
                classes: [AI_BAR_CHAIN_LABEL_CLASS],
                text: `Chain (depth ${payload.depth ?? "?"}) — Prediction`,
                context: null,
                meta: null,
            }),
            div({ classes: [AI_BAR_CHAIN_BODY_CLASS], context: null, meta: null }).setHTML(
                renderMarkdown(String(payload.message ?? ""), window.location.pathname),
            ),
        ],
    );
    insertAboveThinking(container, msg.el);
    scrollToBottom(container);
}

function buildEventHeader(type: string, payload: Payload): Instance {
    return div({ classes: [AI_BAR_EVENT_HEADER_CLASS], context: null, meta: null }, [
        span({ classes: [AI_BAR_EVENT_LABEL_CLASS], text: labelFor(type), context: null, meta: null }),
        span({ classes: [AI_BAR_EVENT_BODY_CLASS], text: summaryLine(type, payload), context: null, meta: null }),
    ]);
}

function buildEventElement(type: string, payload: Payload): HTMLElement {
    const inst = div(
        {
            classes: [AI_BAR_EVENT_CLASS, `${AI_BAR_EVENT_CLASS}--${type}`],
            effects: onceEffect("fade-in"),
            context: null,
            meta: null,
        },
        [buildEventHeader(type, payload)],
    );
    const customBody = buildEventBody(type, payload);
    if (customBody) inst.addChild(customBody);
    else if (hasDetail(type, payload)) inst.addChild(createDetails(() => detailContent(type, payload)));
    return inst.el;
}

export { scrollToBottom, insertAboveThinking, renderChainMessage, buildEventElement, TYPE_CONTINUATION, TYPE_CHAIN };
