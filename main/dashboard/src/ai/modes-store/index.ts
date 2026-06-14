import { createOverridesStore } from "../../state/stores/overrides-store.js";
import { chainModeStore } from "../../dom/ai/send/chain-mode-store";
import { MODE_BY_KEY, defaultOnFor, dependenciesOf } from "./modes.js";
import { STORAGE_KEY, clearStored, readStored, writeStored } from "./storage.js";
import type { ModeKey, ModesOverrides } from "./types.js";

export type { ModeKey, ModeMeta, ModeTier, ModesOverrides } from "./types.js";
export { CLIENT_MODES, MODE_BY_KEY, defaultOnFor, dependenciesOf, modesByTier } from "./modes.js";
export { MODE_TOOLTIPS } from "./tooltips.js";

const CONTINUOUS_KEY: ModeKey = "mode_continuous";

const { data$: data, commit } = createOverridesStore<ModesOverrides>({
    readStored,
    writeStored,
    storageKey: STORAGE_KEY,
});

let suppressChainSync = false;

function syncContinuousToChainModeStore(on: boolean): void {
    suppressChainSync = true;
    try {
        chainModeStore.set(on ? "continuous" : "reactive");
    } finally {
        suppressChainSync = false;
    }
}

export const modesStore = {
    overrides$: data,
    snapshot(): ModesOverrides {
        return data();
    },
    isOn(key: ModeKey): boolean {
        const override = data()[key];
        if (override === undefined) return defaultOnFor(key);
        return override;
    },
    setMode(key: ModeKey, on: boolean): void {
        if (!MODE_BY_KEY.has(key)) return;
        const current = data();
        const next: Record<string, boolean> = { ...current };
        next[key] = on;
        if (on) {
            for (const dep of dependenciesOf(key)) {
                const depCurrent = next[dep] ?? defaultOnFor(dep);
                if (!depCurrent) next[dep] = true;
            }
        }
        commit(next);
        if (key === CONTINUOUS_KEY) syncContinuousToChainModeStore(on);
    },
    resetMode(key: ModeKey): void {
        const current = data();
        if (current[key] === undefined) return;
        const next: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(current)) {
            if (k !== key) next[k] = v;
        }
        commit(next);
        if (key === CONTINUOUS_KEY) syncContinuousToChainModeStore(defaultOnFor(CONTINUOUS_KEY));
    },
    resetAll(): void {
        clearStored();
        data.set(Object.freeze({}));
        syncContinuousToChainModeStore(defaultOnFor(CONTINUOUS_KEY));
    },
    isOverride(key: ModeKey): boolean {
        return data()[key] !== undefined;
    },
};

chainModeStore.onChange((mode) => {
    if (suppressChainSync) return;
    const on = mode === "continuous";
    if (modesStore.isOn(CONTINUOUS_KEY) === on) return;
    modesStore.setMode(CONTINUOUS_KEY, on);
});

(() => {
    const continuousFromModes = modesStore.isOn(CONTINUOUS_KEY);
    if ((chainModeStore.get() === "continuous") !== continuousFromModes) {
        syncContinuousToChainModeStore(continuousFromModes);
    }
})();
