const STORAGE_KEY = "varez_persona_v1";

export { STORAGE_KEY };

export function readStored(): Record<string, string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (parsed === null || typeof parsed !== "object") return {};
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === "string") out[k] = v;
        }
        return out;
    } catch {
        return {};
    }
}

export function writeStored(p: Record<string, string>): void {
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
