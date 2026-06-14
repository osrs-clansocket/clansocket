import { createInstance } from "../../../factory";
import { chainModeStore } from "../chain-mode-store";
import { CONTINUOUS_CLASS, SEND_LABEL, STOP_CLASS, STOP_LABEL, type SendElements, type SendState } from "./types.js";

export function refreshSendButton(els: SendElements, state: SendState): void {
    const hasText = els.input.value.trim().length > 0;
    const sendBtn = createInstance(els.sendBtn);
    if (state.inFlight && !hasText) {
        sendBtn.setText(STOP_LABEL).toggleClass(STOP_CLASS, true);
    } else {
        sendBtn.setText(SEND_LABEL).toggleClass(STOP_CLASS, false);
    }
}

export function refreshContinuousBadge(els: SendElements): void {
    const continuous = chainModeStore.get() === "continuous";
    const bar = els.input.closest(".ai-bar");
    if (bar) bar.classList.toggle(CONTINUOUS_CLASS, continuous);
}
