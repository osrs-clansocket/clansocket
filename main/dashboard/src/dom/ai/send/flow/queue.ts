import { createInstance, div, type Instance } from "../../../factory";
import type { SendResult } from "../../../../ai/client";
import { insertAboveThinking } from "../../chain-events/render";
import { DELIVERED_CLASS, QUEUED_CLASS, type SendElements } from "./types.js";
import { AI_BAR_MSG_CLASS, AI_BAR_MSG_USER_CLASS } from "../../../../shared/constants/ai-bar-constants.js";

const queuedMsgsByContainer = new WeakMap<HTMLElement, Instance[]>();

function getQueuedList(container: HTMLElement): Instance[] {
    let list = queuedMsgsByContainer.get(container);
    if (!list) {
        list = [];
        queuedMsgsByContainer.set(container, list);
    }
    return list;
}

export function pushQueuedUserMsg(els: SendElements, text: string): Instance {
    const msg = div({
        classes: [AI_BAR_MSG_CLASS, AI_BAR_MSG_USER_CLASS, QUEUED_CLASS],
        text,
        context: null,
        meta: null,
    });
    createInstance(els.messagesEl).addChild(msg);
    getQueuedList(els.messagesEl).push(msg);
    return msg;
}

export function consumeQueuedDelivery(els: SendElements): boolean {
    const list = getQueuedList(els.messagesEl);
    const inst = list.shift();
    if (!inst) return false;
    inst.toggleClass(QUEUED_CLASS, false);
    inst.toggleClass(DELIVERED_CLASS, true);
    insertAboveThinking(els.messagesEl, inst.el);
    return true;
}

export function isQueuedResponse(result: SendResult): result is { queued: true; queueLength: number } {
    return (result as { queued?: true }).queued === true;
}
