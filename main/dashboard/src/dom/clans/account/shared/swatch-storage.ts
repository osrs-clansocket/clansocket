import { isHexColor } from "./format";

const CUSTOM_SWATCH_KEY = "clansocket:branding-custom-swatches";
export const CUSTOM_SWATCH_CAP = 32;

export function loadCustomSwatches(): string[] {
    try {
        const raw = window.localStorage.getItem(CUSTOM_SWATCH_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((s): s is string => typeof s === "string" && isHexColor(s));
    } catch {
        return [];
    }
}

export function saveCustomSwatches(list: readonly string[]): void {
    try {
        window.localStorage.setItem(CUSTOM_SWATCH_KEY, JSON.stringify(list));
    } catch {
        return;
    }
}
