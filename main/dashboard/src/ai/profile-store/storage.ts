import type { StoredProfile } from "./types.js";

const STORAGE_KEY = "varez_profile_v1";

export function emptyProfile(): StoredProfile {
    return { identity: {}, session: [], focus: null, lastTurn: 0, updatedAt: Date.now() };
}

export function readStored(): StoredProfile {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyProfile();
        const parsed = JSON.parse(raw) as Partial<StoredProfile>;
        return {
            identity: parsed.identity ?? {},
            session: parsed.session ?? [],
            focus: parsed.focus ?? null,
            lastTurn: parsed.lastTurn ?? 0,
            updatedAt: parsed.updatedAt ?? Date.now(),
        };
    } catch {
        return emptyProfile();
    }
}

export function writeStored(p: StoredProfile): void {
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
