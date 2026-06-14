import type { PositionRow, PositionsPlane, PositionsState } from "../../../../../state/clans/stores/positions-store.js";
import { DEFAULT_PLANE } from "../../../../../shared/constants/clan-map-constants.js";

export function rowsForPlane(state: PositionsState, plane: number): PositionRow[] {
    const out: PositionRow[] = [];
    for (const row of state.byHash.values()) {
        if (row.location_plane === plane) out.push(row);
    }
    return out;
}

function dominantPlane(state: PositionsState, fallback: number): number {
    if (state.byHash.size === 0) return fallback;
    const counts = new Map<number, number>();
    for (const row of state.byHash.values()) {
        counts.set(row.location_plane, (counts.get(row.location_plane) ?? 0) + 1);
    }
    let best = fallback;
    let bestCount = -1;
    for (const [plane, c] of counts) {
        if (c > bestCount) {
            best = plane;
            bestCount = c;
        }
    }
    return best;
}

export function activePlane(state: PositionsState): PositionsPlane | null {
    const wanted = dominantPlane(state, DEFAULT_PLANE);
    for (const p of state.planes) {
        if (p.plane === wanted) return p;
    }
    return null;
}

export function dominantPlaneIndex(state: PositionsState): number {
    const active = activePlane(state);
    return active === null ? DEFAULT_PLANE : active.plane;
}
