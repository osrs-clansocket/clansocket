import { createInstance, div, snapshot, type Instance } from "../../../../factory";
import { MOOD_LABELS, type QuipSet } from "./quip-types.js";
import { createQuipTraverser, type QuipTraverser } from "./quip-picker.js";
import { measureMaxQuipBlockSize } from "./measurers/block-size-measurer.js";

const CARD_CLASS = "ai-bar__auth-card";
const QUIP_CLASS = "ai-bar__auth-quip";
const MOOD_CLASS = "ai-bar__auth-mood";
const BTNS_CLASS = "ai-bar__auth-btns";
const DEFAULT_ROTATE_MS = 20_000;

export interface QuipCardOptions {
    quipSet: QuipSet;
    actions?: readonly Instance[];
    rotateMs?: number;
    extraCardClasses?: readonly string[];
}

export interface QuipCardHandle {
    card: Instance;
    teardown: () => void;
}

function renderQuip(quipEl: Instance, moodEl: Instance, traverser: QuipTraverser): void {
    const quip = traverser.next();
    quipEl.setText(snapshot(quip.text));
    const label = MOOD_LABELS[quip.mood];
    moodEl.setText(snapshot(label));
    moodEl.el.dataset.mood = quip.mood;
    moodEl.el.style.visibility = label === "" ? "hidden" : "visible";
}

function buildCardElements(
    actions: readonly Instance[] | undefined,
    extraClasses: readonly string[] | undefined,
): {
    card: Instance;
    quipEl: Instance;
    moodEl: Instance;
} {
    const quipEl = div({ classes: [QUIP_CLASS], context: null, meta: null });
    const moodEl = div({ classes: [MOOD_CLASS], context: null, meta: null });
    const children: Instance[] = [quipEl, moodEl];
    if (actions && actions.length > 0) {
        children.push(div({ classes: [BTNS_CLASS], context: null, meta: null }, [...actions]));
    }
    const cardClasses = extraClasses && extraClasses.length > 0 ? [CARD_CLASS, ...extraClasses] : [CARD_CLASS];
    const card = div({ classes: cardClasses, context: null, meta: null }, children);
    return { card, quipEl, moodEl };
}

function lockQuipBlockSize(quipEl: Instance, quipSet: QuipSet): void {
    if (!quipEl.el.isConnected) return;
    const maxH = measureMaxQuipBlockSize(quipEl.el, quipSet);
    if (maxH > 0) quipEl.el.style.blockSize = `${maxH}px`;
}

export function mountQuipCard(opts: QuipCardOptions): QuipCardHandle {
    const { card, quipEl, moodEl } = buildCardElements(opts.actions, opts.extraCardClasses);
    const traverser = createQuipTraverser(opts.quipSet);
    renderQuip(quipEl, moodEl, traverser);
    const rotateMs = opts.rotateMs ?? DEFAULT_ROTATE_MS;
    const rafId = window.requestAnimationFrame(() => lockQuipBlockSize(quipEl, opts.quipSet));
    const intervalId = window.setInterval(() => renderQuip(quipEl, moodEl, traverser), rotateMs);
    const teardown = (): void => {
        window.cancelAnimationFrame(rafId);
        window.clearInterval(intervalId);
        const root = card.el;
        if (root.parentNode !== null) createInstance(root).destroy();
    };
    return { card, teardown };
}
