import { renderContinuation } from "./recap";
import {
    scrollToBottom,
    insertAboveThinking,
    renderChainMessage,
    buildEventElement,
    TYPE_CONTINUATION,
    TYPE_CHAIN,
} from "./render";
import type { Payload } from "./summaries";
import { events, AppEvents } from "../../../managers/events";

const TYPE_MEMORY = "memory";

type SpecialRenderer = (container: HTMLElement, payload: Payload) => void;

const SPECIAL_RENDERERS: Record<string, SpecialRenderer> = {
    [TYPE_CONTINUATION]: (container, payload) => renderContinuation(container, payload, scrollToBottom),
    [TYPE_CHAIN]: renderChainMessage,
};

function notifyPanels(type: string, payload: Payload): void {
    if (type === TYPE_MEMORY && payload.ok) {
        events.emit(AppEvents.MEMORY_CHANGED, payload);
    }
}

function addChainEvent(container: HTMLElement, type: string, payload: Payload): void {
    notifyPanels(type, payload);
    const special = SPECIAL_RENDERERS[type];
    if (special) {
        special(container, payload);
        return;
    }
    insertAboveThinking(container, buildEventElement(type, payload));
    scrollToBottom(container);
}

export { addChainEvent };
