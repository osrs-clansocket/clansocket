import type { Signal } from "../../../factory/reactive";
import type { CanvasDims, CanvasRefs } from "./state.js";

const RESIZE_DEBOUNCE_MS = 150;

function lockCanvasCss(refs: CanvasRefs): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = refs.bg.width / dpr;
    const cssH = refs.bg.height / dpr;
    refs.bg.style.width = `${cssW}px`;
    refs.bg.style.height = `${cssH}px`;
    refs.overlay.style.width = `${cssW}px`;
    refs.overlay.style.height = `${cssH}px`;
}

function unlockCanvasCss(refs: CanvasRefs): void {
    refs.bg.style.width = "";
    refs.bg.style.height = "";
    refs.overlay.style.width = "";
    refs.overlay.style.height = "";
}

function snapshotAndResize(refs: CanvasRefs, newW: number, newH: number): void {
    const oldW = refs.bg.width;
    const oldH = refs.bg.height;
    const snap = document.createElement("canvas");
    snap.width = oldW;
    snap.height = oldH;
    const snapCtx = snap.getContext("2d");
    if (snapCtx !== null) snapCtx.drawImage(refs.bg, 0, 0);
    refs.bg.width = newW;
    refs.bg.height = newH;
    refs.overlay.width = newW;
    refs.overlay.height = newH;
    const bgCtx = refs.bg.getContext("2d");
    if (bgCtx !== null && snapCtx !== null) {
        bgCtx.drawImage(snap, 0, 0, oldW, oldH, 0, 0, newW, newH);
    }
}

interface SizerState {
    pending: CanvasDims | null;
    timer: number | null;
    everSized: boolean;
    locked: boolean;
}

function applyResize(refs: CanvasRefs, dims: CanvasDims, canvasDims$: Signal<CanvasDims>, s: SizerState): void {
    snapshotAndResize(refs, dims.w, dims.h);
    if (s.locked) {
        unlockCanvasCss(refs);
        s.locked = false;
    }
    canvasDims$.set(dims);
}

function initialSize(refs: CanvasRefs, w: number, h: number, canvasDims$: Signal<CanvasDims>): void {
    refs.bg.width = w;
    refs.bg.height = h;
    refs.overlay.width = w;
    refs.overlay.height = h;
    canvasDims$.set({ w, h });
}

function scheduleResize(refs: CanvasRefs, canvasDims$: Signal<CanvasDims>, s: SizerState): void {
    if (s.timer !== null) window.clearTimeout(s.timer);
    s.timer = window.setTimeout(() => {
        s.timer = null;
        if (s.pending === null) return;
        const dims = s.pending;
        s.pending = null;
        applyResize(refs, dims, canvasDims$, s);
    }, RESIZE_DEBOUNCE_MS);
}

export function makeCanvasSizer(hostEl: HTMLElement, refs: CanvasRefs, canvasDims$: Signal<CanvasDims>): () => void {
    const s: SizerState = { pending: null, timer: null, everSized: false, locked: false };
    return function syncCanvasSize(): void {
        const dpr = window.devicePixelRatio || 1;
        const rect = hostEl.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        if (refs.bg.width === w && refs.bg.height === h) return;
        if (!s.everSized) {
            s.everSized = true;
            initialSize(refs, w, h, canvasDims$);
            return;
        }
        if (!s.locked) {
            lockCanvasCss(refs);
            s.locked = true;
        }
        s.pending = { w, h };
        scheduleResize(refs, canvasDims$, s);
    };
}
