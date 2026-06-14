export const CHAIN_AUTO_LIMIT = 10;

export const CHAIN_AUTO_LIMIT_WARN_AT = CHAIN_AUTO_LIMIT - 1;

export const KEY_HINT_MAX_CHARS = 48;

export const SESSION_TURN_TRIM = 20;
export const SESSION_TURN_TRIM_MIN = 5;
export const SESSION_TURN_TRIM_MAX = 50;

export const NEXT_POLL_SECONDS_MIN = 15;
export const NEXT_POLL_SECONDS_MAX = 120;
export const NEXT_POLL_SECONDS_RANGE = `${NEXT_POLL_SECONDS_MIN}-${NEXT_POLL_SECONDS_MAX}`;

export function resolveHistoryWindow(overrides?: Record<string, string>): number {
    const raw = overrides?.ai_history_window;
    if (raw === undefined || raw === "") return SESSION_TURN_TRIM;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return SESSION_TURN_TRIM;
    if (n < SESSION_TURN_TRIM_MIN) return SESSION_TURN_TRIM_MIN;
    if (n > SESSION_TURN_TRIM_MAX) return SESSION_TURN_TRIM_MAX;
    return n;
}
