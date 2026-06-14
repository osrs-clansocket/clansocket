import type {
    PositionRow,
    PositionsMapMeta,
    PositionsState,
} from "../../../../../state/clans/stores/positions-store.js";
import type { AtlasBox, CompositeView } from "../../../../../shared/types/clan-map-view-types.js";
import { MAINLAND_DEFAULT, MIN_VIEWPORT_REGIONS } from "../../../../../shared/constants/clan-map-constants.js";
import { worldToImagePx } from "../mappers/coordinate-mapper.js";
import { rowsForPlane } from "../resolvers/plane-resolver.js";

interface ZoomViewportOpts {
    viewport: AtlasBox;
    anchorAtlasX: number;
    anchorAtlasY: number;
    factor: number;
    minDim: number;
    maxDim: number;
}

function aspectFit(
    minHeight: number,
    minWidth: number,
    canvasAspect: number,
    maxDim: number,
): { w: number; h: number } {
    let h = Math.max(minHeight, minWidth / canvasAspect);
    let w = h * canvasAspect;
    if (w > maxDim || h > maxDim) {
        const scaleDown = Math.min(maxDim / w, maxDim / h);
        w = w * scaleDown;
        h = h * scaleDown;
    }
    return { w, h };
}

export function autoViewportFromBlips(
    state: PositionsState,
    plane: number,
    regionPx: number,
    canvasAspect: number,
    maxDim: number,
): AtlasBox {
    const meta = state.mapMeta;
    if (meta === null) return MAINLAND_DEFAULT;
    const rows = rowsForPlane(state, plane);
    if (rows.length === 0) return MAINLAND_DEFAULT;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const row of rows) {
        const { ix, iy } = worldToImagePx(row, meta);
        if (ix < minX) minX = ix;
        if (ix > maxX) maxX = ix;
        if (iy < minY) minY = iy;
        if (iy > maxY) maxY = iy;
    }
    const snappedMinX = Math.floor(minX / regionPx) * regionPx;
    const snappedMaxX = Math.ceil((maxX + 1) / regionPx) * regionPx;
    const snappedMinY = Math.floor(minY / regionPx) * regionPx;
    const snappedMaxY = Math.ceil((maxY + 1) / regionPx) * regionPx;
    const blipW = snappedMaxX - snappedMinX;
    const blipH = snappedMaxY - snappedMinY;
    const minDim = MIN_VIEWPORT_REGIONS * regionPx;
    const { w: vpW, h: vpH } = aspectFit(Math.max(blipH, minDim), Math.max(blipW, minDim), canvasAspect, maxDim);
    const centerX = (snappedMinX + snappedMaxX) / 2;
    const centerY = (snappedMinY + snappedMaxY) / 2;
    return {
        x: centerX - vpW / 2,
        y: centerY - vpH / 2,
        w: vpW,
        h: vpH,
    };
}

export function viewportAroundBlip(
    row: PositionRow,
    meta: PositionsMapMeta,
    regionPx: number,
    regions: number,
    canvasAspect: number,
    maxDim: number,
): AtlasBox {
    const { ix, iy } = worldToImagePx(row, meta);
    const snappedMinX = Math.floor(ix / regionPx) * regionPx;
    const snappedMinY = Math.floor(iy / regionPx) * regionPx;
    const baseDim = regions * regionPx;
    const { w: vpW, h: vpH } = aspectFit(baseDim, baseDim, canvasAspect, maxDim);
    const blipCenterX = snappedMinX + regionPx / 2;
    const blipCenterY = snappedMinY + regionPx / 2;
    return {
        x: blipCenterX - vpW / 2,
        y: blipCenterY - vpH / 2,
        w: vpW,
        h: vpH,
    };
}

export function viewportToComposite(viewport: AtlasBox, canvasW: number, canvasH: number): CompositeView {
    const scale = Math.min(canvasW / viewport.w, canvasH / viewport.h);
    const contentW = viewport.w * scale;
    const contentH = viewport.h * scale;
    return {
        scale,
        offsetX: (canvasW - contentW) / 2 - viewport.x * scale,
        offsetY: (canvasH - contentH) / 2 - viewport.y * scale,
    };
}

export function clampAspectPreserving(
    targetW: number,
    targetH: number,
    minDim: number,
    maxDim: number,
): { w: number; h: number } {
    let w = targetW;
    let h = targetH;
    const scaleUp = Math.max(minDim / w, minDim / h);
    if (scaleUp > 1) {
        w = w * scaleUp;
        h = h * scaleUp;
    }
    const scaleDown = Math.min(maxDim / w, maxDim / h);
    if (scaleDown < 1) {
        w = w * scaleDown;
        h = h * scaleDown;
    }
    return { w, h };
}

export function zoomViewportAround({
    viewport,
    anchorAtlasX,
    anchorAtlasY,
    factor,
    minDim,
    maxDim,
}: ZoomViewportOpts): AtlasBox {
    const { w: newW, h: newH } = clampAspectPreserving(viewport.w * factor, viewport.h * factor, minDim, maxDim);
    const relX = (anchorAtlasX - viewport.x) / viewport.w;
    const relY = (anchorAtlasY - viewport.y) / viewport.h;
    return {
        x: anchorAtlasX - relX * newW,
        y: anchorAtlasY - relY * newH,
        w: newW,
        h: newH,
    };
}

export function expandViewport(viewport: AtlasBox, factor: number): AtlasBox {
    const dw = (viewport.w * (factor - 1)) / 2;
    const dh = (viewport.h * (factor - 1)) / 2;
    return {
        x: viewport.x - dw,
        y: viewport.y - dh,
        w: viewport.w * factor,
        h: viewport.h * factor,
    };
}
