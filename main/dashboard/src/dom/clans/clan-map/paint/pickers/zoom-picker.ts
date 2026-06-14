import { MAX_ZOOM, MIN_ZOOM } from "../../../../../shared/constants/clan-map-constants.js";

export function pickZoom(scale: number): number {
    if (!Number.isFinite(scale) || scale <= 0) return MIN_ZOOM;
    const computed = Math.round(MAX_ZOOM + Math.log2(scale));
    if (computed < MIN_ZOOM) return MIN_ZOOM;
    if (computed > MAX_ZOOM) return MAX_ZOOM;
    return computed;
}
