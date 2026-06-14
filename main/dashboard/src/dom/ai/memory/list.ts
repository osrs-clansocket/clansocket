import { BTN_VARIANT_BARE, button, createInstance, div, span, type Instance } from "../../factory";
import type { MemoryFile } from "../../../ai/memory-client";
import {
    AI_MEMORY_EMPTY_CLASS,
    AI_MEMORY_LIST_ID_CLASS,
    AI_MEMORY_LIST_ITEM_CLASS,
    AI_MEMORY_LIST_TYPE_CLASS,
    AI_MEMORY_LOADER_CLASS,
    AI_MEMORY_LOADER_DOT_CLASS,
} from "../../../shared/constants/ai-memory-constants.js";

const LOADER_DOT_COUNT = 3;

function buildListItem(file: MemoryFile): Instance<HTMLButtonElement> {
    const item = button(
        {
            classes: [AI_MEMORY_LIST_ITEM_CLASS],
            variant: BTN_VARIANT_BARE,
            data: { id: file.id },
            context: "open this memory file",
            meta: ["action"],
        },
        [
            span({ classes: [AI_MEMORY_LIST_ID_CLASS], text: file.id, context: null, meta: null }),
            span({ classes: [AI_MEMORY_LIST_TYPE_CLASS], text: file.type, context: null, meta: null }),
        ],
    );
    return item;
}

function buildLoader(): Instance {
    const dots: Instance[] = [];
    for (let i = 0; i < LOADER_DOT_COUNT; i++)
        dots.push(span({ classes: [AI_MEMORY_LOADER_DOT_CLASS], context: null, meta: null }));
    return div({ classes: [AI_MEMORY_LOADER_CLASS], ariaLabel: "Loading memories", context: null, meta: null }, dots);
}

function renderList(containerEl: HTMLElement, files: MemoryFile[]): void {
    const container = createInstance(containerEl);
    if (files.length === 0) {
        container.setChildren(
            div({ classes: [AI_MEMORY_EMPTY_CLASS], text: "No memory files yet.", context: null, meta: null }),
        );
        return;
    }
    const sorted = [...files].sort((a, b) => a.id.localeCompare(b.id));
    container.setChildren(...sorted.map(buildListItem));
}

function renderLoading(containerEl: HTMLElement): void {
    createInstance(containerEl).setChildren(buildLoader());
}

export { renderList, renderLoading };
