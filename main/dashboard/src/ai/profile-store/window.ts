import { personaStore } from "../persona-store/index.js";

const SLOT_KEY = "ai_history_window";
const DEFAULT_WINDOW = 20;
const MIN_WINDOW = 5;
const MAX_WINDOW = 50;

export function resolveHistoryWindow(): number {
    const raw = personaStore.valueOf(SLOT_KEY);
    if (raw === undefined || raw === "") return DEFAULT_WINDOW;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return DEFAULT_WINDOW;
    if (n < MIN_WINDOW) return MIN_WINDOW;
    if (n > MAX_WINDOW) return MAX_WINDOW;
    return n;
}
