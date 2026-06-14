import { createOverridesStore } from "../../state/stores/overrides-store.js";
import { CLIENT_SLOTS, SLOT_BY_KEY } from "./slots.js";
import { STORAGE_KEY, clearStored, readStored, writeStored } from "./storage.js";
import type { PersonaOverrides, SlotTier } from "./types.js";

export type { PersonaOverrides, SlotBounds, SlotMeta, SlotTier, SlotType } from "./types.js";
export {
    CLIENT_SLOTS,
    CTRL_BLOCK,
    CTRL_ENTRY,
    CTRL_NUMBER,
    CTRL_RANGE,
    CTRL_SELECT,
    CTRL_TOGGLE,
    DOMAIN,
    ENGAGEMENT,
    IDENTITY,
    NUMBER,
    POLICY,
    PROSE,
    SLOT_BY_KEY,
    slotsByTier,
} from "./slots.js";

export type { ControlType } from "./slots.js";
export { TOOLTIPS } from "./tooltips.js";

export function hasOwn(obj: Readonly<Record<string, unknown>>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

const { data$: data, commit } = createOverridesStore<PersonaOverrides>({
    readStored,
    writeStored,
    storageKey: STORAGE_KEY,
});

export const personaStore = {
    overrides$: data,
    snapshot(): PersonaOverrides {
        return data();
    },
    isOverride(key: string): boolean {
        return hasOwn(data(), key);
    },
    valueOf(key: string): string | undefined {
        return data()[key];
    },
    setSlot(key: string, value: string): boolean {
        if (!SLOT_BY_KEY.has(key)) return false;
        commit({ ...data(), [key]: value });
        return true;
    },
    resetSlot(key: string): void {
        const current = data();
        if (!hasOwn(current, key)) return;
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(current)) {
            if (k !== key) next[k] = v;
        }
        commit(next);
    },
    commitOrReset(key: string, type: string, raw: string): void {
        const v = type === "number" ? raw.trim() : raw;
        if (v === "") personaStore.resetSlot(key);
        else personaStore.setSlot(key, v);
    },
    resetTier(tier: SlotTier): void {
        const current = data();
        const next: Record<string, string> = { ...current };
        let dirty = false;
        for (const slot of CLIENT_SLOTS) {
            if (slot.tier === tier && hasOwn(next, slot.key)) {
                delete next[slot.key];
                dirty = true;
            }
        }
        if (dirty) commit(next);
    },
    clear(): void {
        clearStored();
        data.set(Object.freeze({}));
    },
};
