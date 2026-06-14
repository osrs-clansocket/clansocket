import type { ReadSignal } from "../../../factory/reactive";
import type { PositionsState } from "../../../../state/clans/stores/positions-store.js";
import type { MapStateSignals } from "./state.js";
import { clampToAtlas, computeNextViewport } from "./helpers.js";

export function toggleFollow(state: MapStateSignals, hash: string): void {
    state.followedHash$.set(state.followedHash$() === hash ? null : hash);
    if (state.followedHash$() !== null) state.mode$.set("manual");
}

export function toggleAlert(state: MapStateSignals, hash: string): void {
    const cur = state.alertedHashes$();
    const next = new Set(cur);
    if (next.has(hash)) next.delete(hash);
    else next.add(hash);
    state.alertedHashes$.set(next);
}

export function zoomByFactor(state: MapStateSignals, positions$: ReadSignal<PositionsState>, factor: number): void {
    const { next, followed } = computeNextViewport({ state, positions$, factor });
    state.viewport$.set(clampToAtlas(next));
    if (!followed) state.mode$.set("manual");
}

export function resetView(state: MapStateSignals): void {
    state.mode$.set("auto");
}
