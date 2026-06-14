import { createInstance, div, snapshot } from "../../../../../factory";
import type { QuipSet } from "../quip-types.js";

const QUIP_CLASS = "ai-bar__auth-quip";

export function measureMaxQuipBlockSize(refEl: HTMLElement, set: QuipSet): number {
    const parent = refEl.parentElement;
    if (parent === null) return 0;
    const probe = div({ classes: [QUIP_CLASS], context: null, meta: null });
    const s = probe.el.style;
    s.position = "absolute";
    s.visibility = "hidden";
    s.pointerEvents = "none";
    s.display = "block";
    s.minBlockSize = "0";
    s.inlineSize = `${refEl.offsetWidth}px`;
    s.blockSize = "auto";
    createInstance(parent).addChild(probe);
    let max = 0;
    for (const quip of set) {
        probe.setText(snapshot(quip.text));
        const h = probe.el.offsetHeight;
        if (h > max) max = h;
    }
    probe.destroy();
    return max;
}
