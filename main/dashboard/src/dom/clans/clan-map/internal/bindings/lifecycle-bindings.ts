import { effect, type ReadSignal } from "../../../../factory/reactive";
import { scheduleOp } from "../../../../factory/scheduler";
import type { PositionsState } from "../../../../../state/clans/stores/positions-store.js";
import {
    autoViewportFromBlips,
    clampAspectPreserving,
    expandViewport,
    viewportToComposite,
} from "../../paint/calculators/viewport-calculator.js";
import { computeTileRange } from "../../paint/calculators/tile-range-calculator.js";
import { dominantPlaneIndex } from "../../paint/resolvers/plane-resolver.js";
import { prefetchTile } from "../../paint/caches/tile-cache.js";
import { pickZoom } from "../../paint/pickers/zoom-picker.js";
import { MAX_ZOOM, MIN_ZOOM } from "../../../../../shared/constants/clan-map-constants.js";
import type { AtlasBox } from "../../../../../shared/types/clan-map-view-types.js";
import type { BlipPositionAnimator } from "../../paint/animators/blip-position-animator.js";
import type { MapStateSignals } from "../state.js";
import { clampToAtlas, currentMaxDim, currentMinDim, regionPxOf, updateAtlasCache } from "../helpers.js";

const PREFETCH_INFLIGHT = 8;
const PREFETCH_MARGIN = 3;
const ADJACENT_MARGIN = 1;
const ADJACENT_ZOOM_DELTAS: readonly number[] = [-1, 1];

type TileCache = Map<string, HTMLImageElement>;

interface TileCoord {
    zoom: number;
    tx: number;
    ty: number;
}

function pushCoordsAt(coords: TileCoord[], viewport: AtlasBox, zoom: number, margin: number): void {
    const expanded = expandViewport(viewport, margin);
    const range = computeTileRange(expanded, zoom);
    for (let ty = range.tyMin; ty <= range.tyMax; ty++) {
        for (let tx = range.txMin; tx <= range.txMax; tx++) {
            if (tx < 0 || ty < 0) continue;
            coords.push({ zoom, tx, ty });
        }
    }
}

export function bindRegionPxCache(positions$: ReadSignal<PositionsState>): void {
    effect(() => updateAtlasCache(positions$().mapMeta));
}

export function bindAutoViewport(positions$: ReadSignal<PositionsState>, state: MapStateSignals): void {
    let planeInitialized = false;
    effect(() => {
        const ps = positions$();
        if (!planeInitialized && ps.byHash.size > 0) {
            planeInitialized = true;
            state.activePlane$.set(dominantPlaneIndex(ps));
        }
        if (state.mode$() !== "auto") return;
        const plane = state.activePlane$();
        const dims = state.canvasDims$();
        const canvasAspect = dims.h > 0 ? dims.w / dims.h : 1;
        state.viewport$.set(
            clampToAtlas(autoViewportFromBlips(ps, plane, regionPxOf(ps), canvasAspect, currentMaxDim())),
        );
    });
}

const ASPECT_EPS = 0.001;
const SIZE_EPS = 1;

export function bindCanvasAspect(state: MapStateSignals): void {
    effect(() => {
        const dims = state.canvasDims$();
        const vp = state.viewport$();
        if (dims.w <= 0 || dims.h <= 0 || vp.w <= 0 || vp.h <= 0) return;
        const canvasAspect = dims.w / dims.h;
        const viewportAspect = vp.w / vp.h;
        let targetW = vp.w;
        let targetH = vp.h;
        if (Math.abs(canvasAspect - viewportAspect) >= ASPECT_EPS) {
            if (canvasAspect >= viewportAspect) {
                targetH = vp.h;
                targetW = vp.h * canvasAspect;
            } else {
                targetW = vp.w;
                targetH = vp.w / canvasAspect;
            }
        }
        const { w: newW, h: newH } = clampAspectPreserving(targetW, targetH, currentMinDim(), currentMaxDim());
        if (Math.abs(newW - vp.w) < SIZE_EPS && Math.abs(newH - vp.h) < SIZE_EPS) return;
        const centerX = vp.x + vp.w / 2;
        const centerY = vp.y + vp.h / 2;
        state.viewport$.set(clampToAtlas({ x: centerX - newW / 2, y: centerY - newH / 2, w: newW, h: newH }));
    });
}

async function runWorkers<T>(
    items: readonly T[],
    task: (item: T) => Promise<void>,
    isCancelled: () => boolean,
): Promise<void> {
    let index = 0;
    const worker = async (): Promise<void> => {
        while (index < items.length && !isCancelled()) {
            const item = items[index++]!;
            await task(item);
        }
    };
    const workers: Promise<void>[] = [];
    const limit = Math.min(PREFETCH_INFLIGHT, items.length);
    for (let i = 0; i < limit; i++) workers.push(worker());
    await Promise.all(workers);
}

export function bindPrefetch(state: MapStateSignals, cache: TileCache): void {
    let gen = 0;
    effect(() => {
        const plane = state.activePlane$();
        const viewport = state.viewport$();
        const dims = state.canvasDims$();
        const view = viewportToComposite(viewport, dims.w, dims.h);
        const zoom = pickZoom(view.scale);
        const coords: TileCoord[] = [];
        pushCoordsAt(coords, viewport, zoom, PREFETCH_MARGIN);
        for (const delta of ADJACENT_ZOOM_DELTAS) {
            const adjZoom = zoom + delta;
            if (adjZoom < MIN_ZOOM || adjZoom > MAX_ZOOM) continue;
            pushCoordsAt(coords, viewport, adjZoom, ADJACENT_MARGIN);
        }
        if (coords.length === 0) return;
        const myGen = ++gen;
        scheduleOp(() => {
            void runWorkers(
                coords,
                (c) => prefetchTile(plane, c.zoom, c.tx, c.ty, cache),
                () => myGen !== gen,
            );
        }, "idle");
    });
}

export function bindFollow(
    positions$: ReadSignal<PositionsState>,
    state: MapStateSignals,
    animator: BlipPositionAnimator,
): void {
    let rafHandle = 0;
    const tick = (): void => {
        rafHandle = 0;
        const hash = state.followedHash$();
        if (hash === null) return;
        const ps = positions$();
        const row = ps.byHash.get(hash);
        if (row === undefined || ps.mapMeta === null) {
            rafHandle = window.requestAnimationFrame(tick);
            return;
        }
        const interp = animator.getInterpolated(hash, performance.now());
        const worldX = interp === null ? row.location_x : interp.x;
        const worldY = interp === null ? row.location_y : interp.y;
        const ix = (worldX - ps.mapMeta.origin_world_x) * ps.mapMeta.pixels_per_tile;
        const iy = (ps.mapMeta.top_world_y - worldY) * ps.mapMeta.pixels_per_tile;
        const v = state.viewport$();
        const newX = ix - v.w / 2;
        const newY = iy - v.h / 2;
        if (newX !== v.x || newY !== v.y) {
            state.viewport$.set(clampToAtlas({ x: newX, y: newY, w: v.w, h: v.h }));
        }
        if (state.activePlane$() !== row.location_plane) {
            state.activePlane$.set(row.location_plane);
        }
        rafHandle = window.requestAnimationFrame(tick);
    };
    effect(() => {
        if (state.followedHash$() !== null && rafHandle === 0) {
            rafHandle = window.requestAnimationFrame(tick);
        }
    });
}

export function bindAlertAnimation(state: MapStateSignals): void {
    let rafHandle = 0;
    const tick = (): void => {
        rafHandle = 0;
        if (state.alertedHashes$().size === 0) return;
        state.paintTick$.set(state.paintTick$() + 1);
        rafHandle = window.requestAnimationFrame(tick);
    };
    effect(() => {
        if (state.alertedHashes$().size > 0 && rafHandle === 0) {
            rafHandle = window.requestAnimationFrame(tick);
        }
    });
}
