import type { ReadSignal } from "../../../../factory/reactive";
import type { PositionsState } from "../../../../../state/clans/stores/positions-store.js";
import type { MapRegionsState } from "../../../../../state/clans/stores/map-regions-store.js";
import { canvasToAtlas } from "../../paint/mappers/coordinate-mapper.js";
import { regionAtAtlasPoint } from "../../paint/finders/region-finder.js";
import { viewportToComposite } from "../../paint/calculators/viewport-calculator.js";
import { WHEEL_ZOOM_PER_PIXEL } from "../../../../../shared/constants/clan-map-constants.js";
import type { MapStateSignals } from "../state.js";
import { BLIP_HIT_RADIUS_DEV_PX, blipUnderCursor, clampToAtlas, computeNextViewport } from "../helpers.js";

interface PanState {
    dragging: boolean;
    lastX: number;
    lastY: number;
}

function applyPanMove(state: MapStateSignals, dxCanvas: number, dyCanvas: number): void {
    const viewport = state.viewport$();
    const dims = state.canvasDims$();
    const view = viewportToComposite(viewport, dims.w, dims.h);
    state.viewport$.set(
        clampToAtlas({
            x: viewport.x - dxCanvas / view.scale,
            y: viewport.y - dyCanvas / view.scale,
            w: viewport.w,
            h: viewport.h,
        }),
    );
}

function handlePanDown(s: PanState, state: MapStateSignals, canvasEl: HTMLElement, e: PointerEvent): void {
    if (e.button !== 0) return;
    s.dragging = true;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    canvasEl.setPointerCapture(e.pointerId);
    state.mode$.set("manual");
}

function handlePanMove(s: PanState, state: MapStateSignals, e: PointerEvent): void {
    if (!s.dragging) return;
    if (state.followedHash$() !== null) return;
    const dpr = window.devicePixelRatio || 1;
    const dxCanvas = (e.clientX - s.lastX) * dpr;
    const dyCanvas = (e.clientY - s.lastY) * dpr;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    applyPanMove(state, dxCanvas, dyCanvas);
}

function handlePanUp(s: PanState, canvasEl: HTMLElement, e: PointerEvent): void {
    if (!s.dragging) return;
    s.dragging = false;
    if (canvasEl.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId);
}

export function bindPan(canvasEl: HTMLElement, state: MapStateSignals): void {
    const s: PanState = { dragging: false, lastX: 0, lastY: 0 };
    canvasEl.addEventListener("pointerdown", (e) => handlePanDown(s, state, canvasEl, e));
    canvasEl.addEventListener("pointermove", (e) => handlePanMove(s, state, e));
    canvasEl.addEventListener("pointerup", (e) => handlePanUp(s, canvasEl, e));
    canvasEl.addEventListener("pointercancel", (e) => handlePanUp(s, canvasEl, e));
}

function applyWheelZoom(
    canvasEl: HTMLElement,
    state: MapStateSignals,
    positions$: ReadSignal<PositionsState>,
    e: WheelEvent,
): void {
    e.preventDefault();
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    const mouseCx = (e.clientX - rect.left) * dpr;
    const mouseCy = (e.clientY - rect.top) * dpr;
    const factor = Math.exp(e.deltaY * WHEEL_ZOOM_PER_PIXEL);
    const { next, followed } = computeNextViewport({
        state,
        positions$,
        factor,
        anchorCanvasX: mouseCx,
        anchorCanvasY: mouseCy,
    });
    state.viewport$.set(clampToAtlas(next));
    if (!followed) state.mode$.set("manual");
}

export function bindZoom(canvasEl: HTMLElement, state: MapStateSignals, positions$: ReadSignal<PositionsState>): void {
    canvasEl.addEventListener("wheel", (e) => applyWheelZoom(canvasEl, state, positions$, e), { passive: false });
}

function applyHoverMove(
    canvasEl: HTMLElement,
    regions$: ReadSignal<MapRegionsState>,
    positions$: ReadSignal<PositionsState>,
    state: MapStateSignals,
    e: PointerEvent,
): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * dpr;
    const cy = (e.clientY - rect.top) * dpr;
    const dims = state.canvasDims$();
    const view = viewportToComposite(state.viewport$(), dims.w, dims.h);
    const { ax, ay } = canvasToAtlas(view, cx, cy);
    state.hoverRegion$.set(regionAtAtlasPoint(regions$(), ax, ay));
    state.hoveredBlipHash$.set(
        blipUnderCursor({
            ps: positions$(),
            plane: state.activePlane$(),
            view,
            mouseCx: cx,
            mouseCy: cy,
            radius: BLIP_HIT_RADIUS_DEV_PX,
        }),
    );
}

export function bindHover(
    canvasEl: HTMLElement,
    regions$: ReadSignal<MapRegionsState>,
    positions$: ReadSignal<PositionsState>,
    state: MapStateSignals,
): void {
    canvasEl.addEventListener("pointermove", (e) => applyHoverMove(canvasEl, regions$, positions$, state, e));
    canvasEl.addEventListener("pointerleave", () => {
        state.hoverRegion$.set(null);
        state.hoveredBlipHash$.set(null);
    });
}
