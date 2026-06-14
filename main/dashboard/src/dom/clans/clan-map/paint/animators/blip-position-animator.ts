import type { PositionsState } from "../../../../../state/clans/stores/positions-store.js";

const TELEPORT_TILES = 8;
const MIN_DURATION_MS = 200;
const MAX_DURATION_MS = 2000;
const DURATION_MULTIPLIER = 1.5;

interface BlipAnimState {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    startMs: number;
    durationMs: number;
    lastUpdateMs: number;
    lastPlane: number;
}

export interface BlipPositionAnimator {
    update(state: PositionsState, nowMs: number): void;
    getInterpolated(accountHash: string, nowMs: number): { x: number; y: number } | null;
    hasActive(nowMs: number): boolean;
}

function computePosition(anim: BlipAnimState, nowMs: number): { x: number; y: number } {
    if (anim.durationMs <= 0) return { x: anim.toX, y: anim.toY };
    const elapsed = nowMs - anim.startMs;
    const t = Math.min(1, Math.max(0, elapsed / anim.durationMs));
    return {
        x: anim.fromX + (anim.toX - anim.fromX) * t,
        y: anim.fromY + (anim.toY - anim.fromY) * t,
    };
}

export function makeBlipPositionAnimator(): BlipPositionAnimator {
    const animations = new Map<string, BlipAnimState>();
    return {
        update(state: PositionsState, nowMs: number): void {
            for (const [hash, row] of state.byHash) {
                const existing = animations.get(hash);
                if (existing === undefined) {
                    animations.set(hash, {
                        fromX: row.location_x,
                        fromY: row.location_y,
                        toX: row.location_x,
                        toY: row.location_y,
                        startMs: nowMs,
                        durationMs: 0,
                        lastUpdateMs: nowMs,
                        lastPlane: row.location_plane,
                    });
                    continue;
                }
                const planeChanged = existing.lastPlane !== row.location_plane;
                const posSame = existing.toX === row.location_x && existing.toY === row.location_y;
                if (posSame && !planeChanged) continue;
                const dx = row.location_x - existing.toX;
                const dy = row.location_y - existing.toY;
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                if (planeChanged || dist >= TELEPORT_TILES) {
                    existing.fromX = row.location_x;
                    existing.fromY = row.location_y;
                    existing.toX = row.location_x;
                    existing.toY = row.location_y;
                    existing.durationMs = 0;
                } else {
                    const interval = nowMs - existing.lastUpdateMs;
                    const cur = computePosition(existing, nowMs);
                    existing.fromX = cur.x;
                    existing.fromY = cur.y;
                    existing.toX = row.location_x;
                    existing.toY = row.location_y;
                    existing.durationMs = Math.min(
                        MAX_DURATION_MS,
                        Math.max(MIN_DURATION_MS, interval * DURATION_MULTIPLIER),
                    );
                }
                existing.startMs = nowMs;
                existing.lastUpdateMs = nowMs;
                existing.lastPlane = row.location_plane;
            }
            for (const hash of animations.keys()) {
                if (!state.byHash.has(hash)) animations.delete(hash);
            }
        },
        getInterpolated(accountHash: string, nowMs: number): { x: number; y: number } | null {
            const anim = animations.get(accountHash);
            if (anim === undefined) return null;
            return computePosition(anim, nowMs);
        },
        hasActive(nowMs: number): boolean {
            for (const anim of animations.values()) {
                if (anim.durationMs > 0 && nowMs - anim.startMs < anim.durationMs) return true;
            }
            return false;
        },
    };
}
