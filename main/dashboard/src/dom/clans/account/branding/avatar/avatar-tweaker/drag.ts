import type { Instance } from "../../../../../factory/index.js";
import type { BrandingController } from "../../branding-controller/index.js";
import { CANVAS_PX, clamp, TRANSLATE_MAX } from "./constants.js";
import { TWEAKER_CANVAS_DRAGGING_CLASS } from "../../../../../../shared/constants/branding-tweaker-constants.js";

export function wireDragPan(
    canvasInst: Instance<HTMLCanvasElement>,
    ctrl: BrandingController,
    render: () => void,
): void {
    const canvasEl = canvasInst.el;
    const dragState = { active: false, pointerId: -1, startX: 0, startY: 0, baseTX: 0, baseTY: 0 };
    canvasEl.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        dragState.active = true;
        dragState.pointerId = e.pointerId;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        dragState.baseTX = ctrl.transform.translateX;
        dragState.baseTY = ctrl.transform.translateY;
        canvasEl.setPointerCapture(e.pointerId);
        canvasInst.toggleClass(TWEAKER_CANVAS_DRAGGING_CLASS, true);
    });
    canvasEl.addEventListener("pointermove", (e) => {
        if (!dragState.active || e.pointerId !== dragState.pointerId) return;
        const rect = canvasEl.getBoundingClientRect();
        const scaleFactor = rect.width === 0 ? 1 : CANVAS_PX / rect.width;
        const dx = (e.clientX - dragState.startX) * scaleFactor;
        const dy = (e.clientY - dragState.startY) * scaleFactor;
        const nextX = clamp(dragState.baseTX + dx, -TRANSLATE_MAX, TRANSLATE_MAX);
        const nextY = clamp(dragState.baseTY + dy, -TRANSLATE_MAX, TRANSLATE_MAX);
        ctrl.setTransform({ translateX: nextX, translateY: nextY });
        render();
    });
    const endDrag = (e: PointerEvent): void => {
        if (!dragState.active || e.pointerId !== dragState.pointerId) return;
        canvasEl.releasePointerCapture(dragState.pointerId);
        canvasInst.toggleClass(TWEAKER_CANVAS_DRAGGING_CLASS, false);
        dragState.active = false;
    };
    canvasEl.addEventListener("pointerup", endDrag);
    canvasEl.addEventListener("pointercancel", endDrag);
}
