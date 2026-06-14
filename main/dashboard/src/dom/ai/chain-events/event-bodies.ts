import { createInstance, details, div, heading, pre, summary, type Child, type Instance } from "../../factory";
import { buildDiff, buildSingleSide, DIFF_ADD, DIFF_REMOVE } from "./diff";
import type { Payload } from "./summaries";
import {
    AI_BAR_EVENT_CODE_CLASS,
    AI_BAR_EVENT_DETAILS_CLASS,
    AI_BAR_PIN_ITEM_CLASS,
    AI_BAR_PIN_ITEM_ID_CLASS,
    AI_BAR_PIN_LIST_CLASS,
} from "../../../shared/constants/ai-bar-constants.js";

const TYPE_MEMORY = "memory";
const TYPE_PIN = "pin";
const TYPE_UNPIN = "unpin";

const ACTION_CREATE = "create";
const ACTION_UPDATE = "update";
const ACTION_DELETE = "delete";

const BODY_ACTIONS = new Set([ACTION_CREATE, ACTION_UPDATE, ACTION_DELETE]);

type BodyBuilder = (p: Payload) => Instance | null;

function lazyDetails(buildBody: () => Child, context: string): Instance {
    let built = false;
    return details({ classes: [AI_BAR_EVENT_DETAILS_CLASS], context, meta: ["disclosure"] }, [
        summary({
            text: "Expand",
            context: null,
            meta: null,
            onClick: {
                raw: true,
                handler: (e: MouseEvent) => {
                    if (built) return;
                    built = true;
                    const host = (e.currentTarget as HTMLElement).parentElement;
                    if (host) createInstance(host).addChild(buildBody());
                },
            },
        }),
    ]);
}

const NONE = null;

function memoryDiffBody(action: string, before: string, after: string): Instance | null {
    switch (action) {
        case ACTION_CREATE:
            return buildSingleSide(after, DIFF_ADD);
        case ACTION_DELETE:
            return buildSingleSide(before, DIFF_REMOVE);
        case ACTION_UPDATE:
            return buildDiff(before, after);
        default:
            return NONE;
    }
}

function buildMemoryBody(p: Payload): Instance | null {
    if (p.error) return NONE;
    const action = String(p.action ?? "");
    const before = String(p.before ?? "");
    const after = String(p.after ?? "");
    if (!before && !after) return NONE;
    if (!BODY_ACTIONS.has(action)) return NONE;
    return lazyDetails(() => memoryDiffBody(action, before, after)!, "expand the event payload");
}

type PinItem = { id: string; content: string };

function isPinItems(items: unknown): items is PinItem[] {
    return Array.isArray(items) && items.every((i) => i && typeof (i as PinItem).id === "string");
}

function buildPinItemBlock(item: PinItem): Instance {
    return div({ classes: [AI_BAR_PIN_ITEM_CLASS], context: null, meta: null }, [
        heading("h4", { classes: [AI_BAR_PIN_ITEM_ID_CLASS], text: item.id, context: null, meta: null }),
        pre({ classes: [AI_BAR_EVENT_CODE_CLASS], text: item.content || "(empty)", context: null, meta: null }),
    ]);
}

function buildPinListBody(items: PinItem[]): Instance {
    return div({ classes: [AI_BAR_PIN_LIST_CLASS], context: null, meta: null }, items.map(buildPinItemBlock));
}

function buildPinBody(p: Payload): Instance | null {
    const items = p.items;
    if (!isPinItems(items) || items.length === 0) return NONE;
    return lazyDetails(() => buildPinListBody(items), "expand the event payload");
}

const BUILDERS: Record<string, BodyBuilder> = {
    [TYPE_MEMORY]: buildMemoryBody,
    [TYPE_PIN]: buildPinBody,
    [TYPE_UNPIN]: buildPinBody,
};

function buildEventBody(type: string, payload: Payload): Instance | null {
    return BUILDERS[type]?.(payload) ?? NONE;
}

export { buildEventBody, lazyDetails };
