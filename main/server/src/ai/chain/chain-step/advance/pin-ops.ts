import { memoryStore, type MemoryOp } from "../../../memory/memory-store/index.js";
import { pinnedContext } from "../../../memory/pinned-context.js";
import type { ParsedResponse } from "../../response-parser/index.js";
import { resolvePinItems } from "../helpers.js";
import type { ChainEvent } from "../types.js";

type ParsedSlice = Pick<ParsedResponse, "memory" | "pin" | "unpin">;

export function applyMemoryOps(
    parsed: ParsedSlice,
    siteAccountId: string,
    events: ChainEvent[],
    modeOverrides: Record<string, boolean> = {},
): void {
    if (!parsed.memory || parsed.memory.length === 0) return;
    if (modeOverrides.mode_memory_authoring === false) return;
    const autoPinIds: string[] = [];
    for (const raw of parsed.memory) {
        const result = memoryStore.apply(raw as unknown as MemoryOp);
        events.push({ type: "memory", payload: { ...result } });
        if (result.ok && result.pinned && result.id) autoPinIds.push(result.id);
    }
    if (autoPinIds.length > 0 && modeOverrides.mode_pin_unpin !== false) {
        pinnedContext.pin(siteAccountId, autoPinIds, { auto: true });
        events.push({
            type: "pin",
            payload: { ids: autoPinIds, auto: true, items: resolvePinItems(autoPinIds, siteAccountId) },
        });
    }
}

export function applyPinUnpin(
    parsed: ParsedSlice,
    siteAccountId: string,
    events: ChainEvent[],
    modeOverrides: Record<string, boolean> = {},
): void {
    if (modeOverrides.mode_pin_unpin === false) return;
    if (parsed.pin.length > 0) {
        pinnedContext.pin(siteAccountId, parsed.pin);
        events.push({
            type: "pin",
            payload: { ids: parsed.pin, items: resolvePinItems(parsed.pin, siteAccountId) },
        });
    }
    if (parsed.unpin.length > 0) {
        const unpinItems = resolvePinItems(parsed.unpin, siteAccountId);
        pinnedContext.unpin(siteAccountId, parsed.unpin);
        events.push({ type: "unpin", payload: { ids: parsed.unpin, items: unpinItems } });
    }
}
