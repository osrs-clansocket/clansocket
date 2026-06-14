import type { AtlasBox, CompositeView } from "../../../../../shared/types/clan-map-view-types.js";

const PAINT_GAP_RESET_MS = 50;

export interface SmearState {
    blurPx: number;
    prevCenterX: number;
    prevCenterY: number;
}

export interface UpdateSmearOpts {
    view: CompositeView;
    viewport: AtlasBox;
    prev: SmearState | null;
    paintGapMs: number;
    threshold: number;
    maxBlurPx: number;
    blurScale: number;
}

export function updateSmearState(opts: UpdateSmearOpts): SmearState {
    const { view, viewport, prev, paintGapMs, threshold, maxBlurPx, blurScale } = opts;
    const centerX = viewport.x + viewport.w / 2;
    const centerY = viewport.y + viewport.h / 2;
    if (prev === null || paintGapMs > PAINT_GAP_RESET_MS) {
        return { blurPx: 0, prevCenterX: centerX, prevCenterY: centerY };
    }
    const dx = (centerX - prev.prevCenterX) * view.scale;
    const dy = (centerY - prev.prevCenterY) * view.scale;
    const speed = Math.sqrt(dx * dx + dy * dy);
    const blurPx = Math.min(maxBlurPx, Math.max(0, (speed - threshold) * blurScale));
    return { blurPx, prevCenterX: centerX, prevCenterY: centerY };
}
