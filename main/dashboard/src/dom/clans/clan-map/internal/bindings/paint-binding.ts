import { effect, type ReadSignal } from "../../../../factory/reactive";
import { scheduleOp } from "../../../../factory/scheduler";
import type { PositionsState } from "../../../../../state/clans/stores/positions-store.js";
import type { MapRegionsState } from "../../../../../state/clans/stores/map-regions-store.js";
import { collectBlips } from "../../paint/collectors/blip-collector.js";
import { paintBlips } from "../../paint/painters/blip-painter.js";
import { paintGrid } from "../../paint/painters/grid-painter.js";
import { paintTiles } from "../../paint/painters/tile-painter.js";
import { viewportToComposite } from "../../paint/calculators/viewport-calculator.js";
import { updateSmearState, type SmearState } from "../../paint/calculators/motion-smear-calculator.js";
import type { BlipPositionAnimator } from "../../paint/animators/blip-position-animator.js";
import type { CanvasRefs, MapStateSignals } from "../state.js";

const MOTION_BLUR_MIN_SPEED = 8;
const MOTION_BLUR_MAX_PX = 1.2;
const MOTION_BLUR_SCALE = 0.025;

type TileCache = Map<string, HTMLImageElement>;

interface SmearTracker {
    state: SmearState | null;
    lastPaintTime: number;
    residualRafId: number;
}

export interface PaintBindOpts {
    positions$: ReadSignal<PositionsState>;
    regions$: ReadSignal<MapRegionsState>;
    state: MapStateSignals;
    refs: CanvasRefs;
    cache: TileCache;
    blipAnimator: BlipPositionAnimator;
}

interface PaintFrameOpts extends PaintBindOpts {
    bgCtx: CanvasRenderingContext2D;
    overlayCtx: CanvasRenderingContext2D;
    onTileReady: () => void;
    smearTracker: SmearTracker;
    blipAnimator: BlipPositionAnimator;
}

function applyBlurFilter(refs: CanvasRefs, blurPx: number): void {
    const filterValue = blurPx > 0 ? `blur(${blurPx}px)` : "";
    refs.bg.style.filter = filterValue;
    refs.overlay.style.filter = filterValue;
}

function paintFrame(opts: PaintFrameOpts): void {
    const { positions$, regions$, state, cache, bgCtx, overlayCtx, onTileReady, smearTracker, blipAnimator, refs } =
        opts;
    if (smearTracker.residualRafId !== 0) {
        window.cancelAnimationFrame(smearTracker.residualRafId);
        smearTracker.residualRafId = 0;
    }
    const ps = positions$();
    if (ps.mapMeta === null) return;
    const regions = regions$();
    const dims = state.canvasDims$();
    const plane = state.activePlane$();
    const viewport = state.viewport$();
    const view = viewportToComposite(viewport, dims.w, dims.h);
    const now = performance.now();
    blipAnimator.update(ps, now);
    paintTiles({ ctx: bgCtx, w: dims.w, h: dims.h, view, viewport, plane, cache, onTileReady });
    const blips = collectBlips(ps, plane, view, blipAnimator);
    paintBlips({
        ctx: overlayCtx,
        w: dims.w,
        h: dims.h,
        blips,
        alertedHashes: state.alertedHashes$(),
        showLastKnown: state.lastKnownVisible$(),
    });
    if (state.gridVisible$() && regions.length > 0) {
        paintGrid({ ctx: overlayCtx, w: dims.w, h: dims.h, view, regions });
    }
    const paintGapMs = now - smearTracker.lastPaintTime;
    smearTracker.lastPaintTime = now;
    const next = updateSmearState({
        view,
        viewport,
        prev: smearTracker.state,
        paintGapMs,
        threshold: MOTION_BLUR_MIN_SPEED,
        maxBlurPx: MOTION_BLUR_MAX_PX,
        blurScale: MOTION_BLUR_SCALE,
    });
    smearTracker.state = next;
    applyBlurFilter(refs, next.blurPx);
    if (next.blurPx > 0 || blipAnimator.hasActive(now)) {
        smearTracker.residualRafId = window.requestAnimationFrame(() => {
            smearTracker.residualRafId = 0;
            onTileReady();
        });
    }
    if (blipAnimator.hasActive(now)) {
        state.paintTick$.set(state.paintTick$() + 1);
    }
}

export function bindPaint(opts: PaintBindOpts): void {
    const bgCtx = opts.refs.bg.getContext("2d");
    const overlayCtx = opts.refs.overlay.getContext("2d");
    if (bgCtx === null || overlayCtx === null) return;
    const smearTracker: SmearTracker = {
        state: null,
        lastPaintTime: performance.now(),
        residualRafId: 0,
    };
    const blipAnimator = opts.blipAnimator;
    let paintScheduled = false;
    const schedulePaint = (): void => {
        if (paintScheduled) return;
        paintScheduled = true;
        scheduleOp(() => {
            paintScheduled = false;
            paintFrame({ ...opts, bgCtx, overlayCtx, onTileReady: schedulePaint, smearTracker, blipAnimator });
        }, "animation");
    };
    effect(() => {
        opts.positions$();
        opts.regions$();
        opts.state.viewport$();
        opts.state.canvasDims$();
        opts.state.activePlane$();
        opts.state.gridVisible$();
        opts.state.alertedHashes$();
        opts.state.paintTick$();
        opts.state.lastKnownVisible$();
        opts.state.mergedLayersVisible$();
        schedulePaint();
    });
}
