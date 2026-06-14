import { applyHeight, clampHeight, readStored } from "./resize-storage.js";
import { beginDrag, continueDrag, createDragState, endDrag, type DragTargets } from "./resize-drag.js";

function initResize(bar: HTMLElement, handle: HTMLElement, history: HTMLElement): void {
    const stored = readStored();
    if (stored !== undefined) applyHeight(bar, clampHeight(stored));
    const state = createDragState();
    const guarded =
        (action: (e: PointerEvent) => void) =>
        (e: PointerEvent): void => {
            if (state.unsub !== null) action(e);
        };
    const targets: DragTargets = { bar, handle, history };
    handle.addEventListener("pointerdown", (e) => beginDrag(state, targets, e));
    handle.addEventListener(
        "pointermove",
        guarded((e) => continueDrag(state, e)),
    );
    const onEnd = guarded((e) => endDrag(state, bar, handle, e));
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
}

export { initResize };
