import { createInstance, image, snapshot, span, type Instance } from "../factory";
import { IDLE_PHRASES } from "./idle-phrases";
import { setDynProp } from "../../state/dynamic-styles";
import { scrollToBottomCoalesced } from "./panel/layout/scroll-to-bottom.js";
import {
    AI_BAR_HISTORY_CLASS,
    AI_BAR_THINK_ICON_CLASS,
    AI_BAR_THINK_LABEL_CLASS,
} from "../../shared/constants/ai-bar-constants.js";

const SPIN_OUT_MS = 150;
const SPIN_SETTLE_MS = 300;
const QP_STEP_MS = 150;
const QP_FIRE_DELAY = 200;
const QP_ROLL = 0.08;
const QP_SEQUENCE = ["q p", "   W", "...damn it."];

const NO_REF = null;
let iconCache: string[] | null = NO_REF;
let thinkingEl: HTMLElement | null = NO_REF;

function withThinkingEl<T>(fn: (host: HTMLElement) => T, fallback: T): T {
    return thinkingEl ? fn(thinkingEl) : fallback;
}

function collectIcons(): string[] {
    if (iconCache) return iconCache;
    const seen = new Set<string>();
    const icons: string[] = [];
    for (const img of document.querySelectorAll<HTMLImageElement>(".metric-icon")) {
        if (img.src && !seen.has(img.src)) {
            seen.add(img.src);
            icons.push(img.src);
        }
    }
    iconCache = icons;
    return icons;
}

function randomIcon(): string {
    const icons = collectIcons();
    return icons.length > 0 ? icons[Math.floor(Math.random() * icons.length)]! : "";
}

function getThinkLabel(): HTMLSpanElement | null {
    return thinkingEl?.querySelector<HTMLSpanElement>(`.${AI_BAR_THINK_LABEL_CLASS}`) ?? NO_REF;
}

function withLabel(fn: (label: HTMLSpanElement) => void): void {
    const label = getThinkLabel();
    if (label) fn(label);
}

function setLabelText(l: HTMLSpanElement, text: string): void {
    createInstance(l).setText(snapshot(text));
}

function scheduleLabelText(stepIndex: number, text: string): void {
    setTimeout(() => withLabel((l) => setLabelText(l, text)), QP_STEP_MS * stepIndex);
}

function fireQpSequence(): void {
    withLabel((l) => setLabelText(l, QP_SEQUENCE[0]!));
    scheduleLabelText(1, QP_SEQUENCE[1]!);
    scheduleLabelText(2, QP_SEQUENCE[2]!);
}

function randomIdlePhrase(): string {
    if (Math.random() < QP_ROLL) {
        setTimeout(fireQpSequence, QP_FIRE_DELAY);
        return QP_SEQUENCE[0]!;
    }
    return IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)]!;
}

function buildThinkEls(host: Instance): { icon: HTMLImageElement; label: HTMLSpanElement } {
    const iconInst = image({ src: "", classes: [AI_BAR_THINK_ICON_CLASS], context: null, meta: null });
    const labelInst = span({ classes: [AI_BAR_THINK_LABEL_CLASS], context: null, meta: null });
    host.setChildren(iconInst, labelInst);
    scrollThinkingVisible();
    return { icon: iconInst.el, label: labelInst.el };
}

function ensureThinkEls(): { icon: HTMLImageElement; label: HTMLSpanElement } | null {
    return withThinkingEl((hostEl) => {
        const existingIcon = hostEl.querySelector<HTMLImageElement>(`.${AI_BAR_THINK_ICON_CLASS}`);
        const existingLabel = hostEl.querySelector<HTMLSpanElement>(`.${AI_BAR_THINK_LABEL_CLASS}`);
        if (existingIcon && existingLabel) return { icon: existingIcon, label: existingLabel };
        return buildThinkEls(createInstance(hostEl));
    }, NO_REF);
}

function spinIn(icon: HTMLImageElement, label: HTMLSpanElement, text: string): void {
    const src = randomIcon();
    icon.src = src || "";
    setDynProp(icon, "display", src ? "" : "none");
    icon.classList.remove(`${AI_BAR_THINK_ICON_CLASS}--out`);
    icon.classList.add(`${AI_BAR_THINK_ICON_CLASS}--in`);
    createInstance(label).setText(snapshot(text));
    label.classList.remove(`${AI_BAR_THINK_LABEL_CLASS}--out`);
    label.classList.add(`${AI_BAR_THINK_LABEL_CLASS}--in`);
    setTimeout(() => {
        icon.classList.remove(`${AI_BAR_THINK_ICON_CLASS}--in`);
        label.classList.remove(`${AI_BAR_THINK_LABEL_CLASS}--in`);
    }, SPIN_SETTLE_MS);
}

function scrollThinkingVisible(): void {
    withThinkingEl((host) => {
        const scrollParent = host.closest<HTMLElement>(`.${AI_BAR_HISTORY_CLASS}`);
        if (scrollParent) scrollToBottomCoalesced(scrollParent);
    }, undefined);
}

function updateThinking(text: string): void {
    const els = ensureThinkEls();
    if (els) animateThinking(els, text);
}

function animateThinking(els: { icon: HTMLImageElement; label: HTMLSpanElement }, text: string): void {
    els.icon.classList.add(`${AI_BAR_THINK_ICON_CLASS}--out`);
    els.label.classList.add(`${AI_BAR_THINK_LABEL_CLASS}--out`);
    setTimeout(() => {
        spinIn(els.icon, els.label, text);
        scrollThinkingVisible();
    }, SPIN_OUT_MS);
}

function setThinkingEl(el: HTMLElement | null): void {
    thinkingEl = el;
}

export { updateThinking, randomIdlePhrase, setThinkingEl };
