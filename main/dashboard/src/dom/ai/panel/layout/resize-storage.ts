import { setDynProp } from "../../../../state/dynamic-styles.js";

const STORAGE_KEY = "varez_ai_bar_history_height";
const MIN_PX = 120;
const MAX_VH_RATIO = 0.85;
export const CSS_VAR = "--ai-history-h";

export function readStored(): number | undefined {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null || raw === "") return undefined;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    } catch {
        return undefined;
    }
}

function writeStored(px: number): void {
    try {
        localStorage.setItem(STORAGE_KEY, String(Math.round(px)));
    } catch {
        return;
    }
}

export function clampHeight(px: number): number {
    const max = Math.round(window.innerHeight * MAX_VH_RATIO);
    return Math.max(MIN_PX, Math.min(max, px));
}

export function applyHeight(bar: HTMLElement, px: number): void {
    setDynProp(bar, CSS_VAR, `${Math.round(px)}px`);
}

export function persistCurrentHeight(bar: HTMLElement): void {
    const px = parseInt(getComputedStyle(bar).getPropertyValue(CSS_VAR).trim(), 10);
    if (Number.isFinite(px)) writeStored(px);
}
