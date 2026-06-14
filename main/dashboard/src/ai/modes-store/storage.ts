import type { ModesOverrides } from "./types.js";

export const STORAGE_KEY = "varez_modes_v1";

export function readStored(): ModesOverrides {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (parsed === null || typeof parsed !== "object") return {};
        const out: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === "boolean") out[k] = v;
        }
        return out as ModesOverrides;
    } catch {
        return {};
    }
}

export function writeStored(p: ModesOverrides): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
        return;
    }
}

export function clearStored(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        return;
    }
}
