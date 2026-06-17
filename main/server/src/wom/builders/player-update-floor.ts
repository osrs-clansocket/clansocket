const MIN_PLAYER_UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const RECOMMENDED_PLAYER_UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function isPlayerUpdateAllowed(lastUpdateAtMs: number | null, nowMs: number = Date.now()): boolean {
    if (lastUpdateAtMs === null) return true;
    return nowMs - lastUpdateAtMs >= MIN_PLAYER_UPDATE_INTERVAL_MS;
}

export function isPlayerUpdateRecommended(lastUpdateAtMs: number | null, nowMs: number = Date.now()): boolean {
    if (lastUpdateAtMs === null) return true;
    return nowMs - lastUpdateAtMs >= RECOMMENDED_PLAYER_UPDATE_INTERVAL_MS;
}

export function msUntilPlayerUpdateAllowed(lastUpdateAtMs: number | null, nowMs: number = Date.now()): number {
    if (lastUpdateAtMs === null) return 0;
    const elapsed = nowMs - lastUpdateAtMs;
    if (elapsed >= MIN_PLAYER_UPDATE_INTERVAL_MS) return 0;
    return MIN_PLAYER_UPDATE_INTERVAL_MS - elapsed;
}
