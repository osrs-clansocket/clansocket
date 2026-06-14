import { defaultValueOf } from "../../../../../../ai/persona-store/defaults-client.js";
import type { SlotMeta } from "../../../../../../ai/persona-store/index.js";

const BLOCK_PLACEHOLDER_MAX = 160;
const ENTRY_PLACEHOLDER_MAX = 60;

function placeholderText(meta: SlotMeta, maxLen: number): string {
    const v = defaultValueOf(meta.key);
    if (v === "") return "Server default";
    let oneLine = "";
    let inSpace = true;
    for (let i = 0; i < v.length; i++) {
        const c = v[i];
        const isSpace = c === " " || c === "\t" || c === "\n" || c === "\r";
        if (isSpace) {
            if (!inSpace) oneLine += " ";
            inSpace = true;
        } else {
            oneLine += c;
            inSpace = false;
        }
    }
    oneLine = oneLine.trim();
    return oneLine.length > maxLen ? `${oneLine.slice(0, maxLen)}…` : oneLine;
}

export function placeholderForBlock(meta: SlotMeta): string {
    return placeholderText(meta, BLOCK_PLACEHOLDER_MAX);
}

export function placeholderForEntry(meta: SlotMeta): string {
    return placeholderText(meta, ENTRY_PLACEHOLDER_MAX);
}
