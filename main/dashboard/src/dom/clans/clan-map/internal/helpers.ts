import type { ReadSignal } from "../../../factory/reactive";
import { canvasToAtlas } from "../paint/mappers/coordinate-mapper.js";
import {
    clampAspectPreserving,
    viewportToComposite,
    zoomViewportAround,
} from "../paint/calculators/viewport-calculator.js";
import type { AtlasBox } from "../../../../shared/types/clan-map-view-types.js";
import type { PositionsState } from "../../../../state/clans/stores/positions-store.js";
import type { MapStateSignals } from "./state.js";
import { MIN_VIEWPORT_REGIONS, REGION_PX_DEFAULT } from "../../../../shared/constants/clan-map-constants.js";

const MOBILE_MQ = "(max-width: 48rem)";
const MIN_VIEWPORT_REGIONS_MOBILE = 1;
const ATLAS_W_FALLBACK = 13056;
const ATLAS_H_FALLBACK = 45568;
export const BLIP_HIT_RADIUS_DEV_PX = 18;

let cachedRegionPx = REGION_PX_DEFAULT;
let cachedAtlasW = ATLAS_W_FALLBACK;
let cachedAtlasH = ATLAS_H_FALLBACK;

export function updateAtlasCache(meta: PositionsState["mapMeta"]): void {
    cachedRegionPx = meta?.region_px ?? REGION_PX_DEFAULT;
    if (meta !== null) {
        cachedAtlasW = meta.width;
        cachedAtlasH = meta.height;
    }
}

export function regionPxOf(state: PositionsState): number {
    return state.mapMeta?.region_px ?? REGION_PX_DEFAULT;
}

export function currentMinRegions(): number {
    return window.matchMedia(MOBILE_MQ).matches ? MIN_VIEWPORT_REGIONS_MOBILE : MIN_VIEWPORT_REGIONS;
}

export function currentMaxDim(): number {
    return cachedAtlasW;
}

export function currentMinDim(): number {
    return currentMinRegions() * cachedRegionPx;
}

function zoomBounds(regionPx: number): { minDim: number; maxDim: number } {
    return { minDim: currentMinRegions() * regionPx, maxDim: cachedAtlasW };
}

function clampAxis(start: number, len: number, atlasLen: number): number {
    if (len >= atlasLen) return (atlasLen - len) / 2;
    return Math.max(0, Math.min(atlasLen - len, start));
}

export function clampToAtlas(viewport: AtlasBox): AtlasBox {
    return {
        x: clampAxis(viewport.x, viewport.w, cachedAtlasW),
        y: clampAxis(viewport.y, viewport.h, cachedAtlasH),
        w: viewport.w,
        h: viewport.h,
    };
}

interface ZoomCenteredOpts {
    viewport: AtlasBox;
    ax: number;
    ay: number;
    factor: number;
    minDim: number;
    maxDim: number;
}

function zoomCenteredOn({ viewport, ax, ay, factor, minDim, maxDim }: ZoomCenteredOpts): AtlasBox {
    const { w: newW, h: newH } = clampAspectPreserving(viewport.w * factor, viewport.h * factor, minDim, maxDim);
    return { x: ax - newW / 2, y: ay - newH / 2, w: newW, h: newH };
}

interface BlipHitOpts {
    ps: PositionsState;
    plane: number;
    view: { scale: number; offsetX: number; offsetY: number };
    mouseCx: number;
    mouseCy: number;
    radius: number;
}

export function blipUnderCursor({ ps, plane, view, mouseCx, mouseCy, radius }: BlipHitOpts): string | null {
    if (ps.mapMeta === null) return null;
    const r2 = radius * radius;
    for (const row of ps.byHash.values()) {
        if (row.location_plane !== plane) continue;
        const ix = (row.location_x - ps.mapMeta.origin_world_x) * ps.mapMeta.pixels_per_tile;
        const iy = (ps.mapMeta.top_world_y - row.location_y) * ps.mapMeta.pixels_per_tile;
        const bx = ix * view.scale + view.offsetX;
        const by = iy * view.scale + view.offsetY;
        const dx = bx - mouseCx;
        const dy = by - mouseCy;
        if (dx * dx + dy * dy <= r2) return row.account_hash;
    }
    return null;
}

export function followedAtlasPoint(
    positions: PositionsState,
    followedHash: string | null,
): { ax: number; ay: number } | null {
    if (followedHash === null) return null;
    const row = positions.byHash.get(followedHash);
    if (row === undefined || positions.mapMeta === null) return null;
    return {
        ax: (row.location_x - positions.mapMeta.origin_world_x) * positions.mapMeta.pixels_per_tile,
        ay: (positions.mapMeta.top_world_y - row.location_y) * positions.mapMeta.pixels_per_tile,
    };
}

interface ZoomByFactorOpts {
    state: MapStateSignals;
    positions$: ReadSignal<PositionsState>;
    factor: number;
    anchorCanvasX?: number;
    anchorCanvasY?: number;
}

export function computeNextViewport(opts: ZoomByFactorOpts): { next: AtlasBox; followed: boolean } {
    const { state, positions$, factor, anchorCanvasX, anchorCanvasY } = opts;
    const viewport = state.viewport$();
    const dims = state.canvasDims$();
    const view = viewportToComposite(viewport, dims.w, dims.h);
    const followAnchor = followedAtlasPoint(positions$(), state.followedHash$());
    const { minDim, maxDim } = zoomBounds(cachedRegionPx);
    if (followAnchor !== null) {
        return {
            next: zoomCenteredOn({ viewport, ax: followAnchor.ax, ay: followAnchor.ay, factor, minDim, maxDim }),
            followed: true,
        };
    }
    const cx = anchorCanvasX ?? dims.w / 2;
    const cy = anchorCanvasY ?? dims.h / 2;
    const { ax, ay } = canvasToAtlas(view, cx, cy);
    return {
        next: zoomViewportAround({ viewport, anchorAtlasX: ax, anchorAtlasY: ay, factor, minDim, maxDim }),
        followed: false,
    };
}

interface ZoomByAtlasAnchorOpts {
    viewport: AtlasBox;
    factor: number;
    anchorAtlasX: number;
    anchorAtlasY: number;
    followAtlasPoint: { ax: number; ay: number } | null;
    centerOnAnchor?: boolean;
}

export function computeNextViewportAtlasAnchor(opts: ZoomByAtlasAnchorOpts): { next: AtlasBox; followed: boolean } {
    const { viewport, factor, anchorAtlasX, anchorAtlasY, followAtlasPoint, centerOnAnchor } = opts;
    const { minDim, maxDim } = zoomBounds(cachedRegionPx);
    if (followAtlasPoint !== null) {
        return {
            next: zoomCenteredOn({
                viewport,
                ax: followAtlasPoint.ax,
                ay: followAtlasPoint.ay,
                factor,
                minDim,
                maxDim,
            }),
            followed: true,
        };
    }
    if (centerOnAnchor === true) {
        return {
            next: zoomCenteredOn({ viewport, ax: anchorAtlasX, ay: anchorAtlasY, factor, minDim, maxDim }),
            followed: false,
        };
    }
    return {
        next: zoomViewportAround({ viewport, anchorAtlasX, anchorAtlasY, factor, minDim, maxDim }),
        followed: false,
    };
}
