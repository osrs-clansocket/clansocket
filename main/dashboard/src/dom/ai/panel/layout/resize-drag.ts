import { isScrolledToBottom } from "./bar-height.js";
import { rafScheduler } from "../../../../managers/raf.js";
import { applyHeight, clampHeight, persistCurrentHeight } from "./resize-storage.js";

const EXPANDED_CLASS = "ai-bar--expanded";
const RESIZING_CLASS = "ai-bar--resizing";

const noopScroll = (_d: number): void => undefined;
const followScroll = (d: number): void => window.scrollBy(0, d);

export interface DragState {
    startY: number;
    startH: number;
    startDistFromBottom: number;
    startScrollHeight: number;
    pendingY: number;
    lastAppliedY: number;
    prevAppliedH: number;
    applyScrollFollow: (deltaPx: number) => void;
    unsub: (() => void) | null;
}

export interface DragTargets {
    bar: HTMLElement;
    handle: HTMLElement;
    history: HTMLElement;
}

function releaseIfCaptured(handle: HTMLElement, pointerId: number): void {
    if (!handle.hasPointerCapture(pointerId)) return;
    handle.releasePointerCapture(pointerId);
}

function tick(state: DragState, bar: HTMLElement, history: HTMLElement): void {
    if (state.pendingY === state.lastAppliedY) return;
    state.lastAppliedY = state.pendingY;
    const newH = clampHeight(state.startH + (state.startY - state.pendingY));
    applyHeight(bar, newH);
    const sh = state.startScrollHeight;
    const maxScroll = Math.max(0, sh - Math.min(sh, newH));
    history.scrollTop = Math.max(0, Math.min(maxScroll, maxScroll - state.startDistFromBottom));
    state.applyScrollFollow(newH - state.prevAppliedH);
    state.prevAppliedH = newH;
}

export function beginDrag(state: DragState, targets: DragTargets, e: PointerEvent): void {
    const { bar, handle, history } = targets;
    if (!bar.classList.contains(EXPANDED_CLASS)) bar.classList.add(EXPANDED_CLASS);
    state.startY = e.clientY;
    state.pendingY = e.clientY;
    state.lastAppliedY = e.clientY;
    state.startH = history.getBoundingClientRect().height;
    state.startScrollHeight = history.scrollHeight;
    state.startDistFromBottom = history.scrollHeight - history.scrollTop - history.clientHeight;
    state.prevAppliedH = state.startH;
    state.applyScrollFollow = isScrolledToBottom() ? followScroll : noopScroll;
    bar.classList.add(RESIZING_CLASS);
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
    state.unsub = rafScheduler.subscribe(() => tick(state, bar, history));
}

export function continueDrag(state: DragState, e: PointerEvent): void {
    state.pendingY = e.clientY;
}

export function endDrag(state: DragState, bar: HTMLElement, handle: HTMLElement, e: PointerEvent): void {
    state.unsub?.();
    state.unsub = null;
    bar.classList.remove(RESIZING_CLASS);
    releaseIfCaptured(handle, e.pointerId);
    persistCurrentHeight(bar);
}

export function createDragState(): DragState {
    const z = 0;
    return {
        startY: z,
        startH: z,
        startDistFromBottom: z,
        startScrollHeight: z,
        pendingY: z,
        lastAppliedY: z,
        prevAppliedH: z,
        applyScrollFollow: noopScroll,
        unsub: null,
    };
}
