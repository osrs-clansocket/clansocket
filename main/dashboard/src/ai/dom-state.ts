import { DEDUP_SEP } from "./actions/action-types.js";

const TEXT_PREVIEW_LENGTH = 200;

interface ElementState {
    tag: string;
    classes: string;
    text: string;
    visible: boolean;
    ariaLabel?: string;
    role?: string;
    value?: string;
    placeholder?: string;
    href?: string;
    type?: string;
    name?: string;
    disabled?: boolean;
    checked?: boolean;
    hidden?: boolean;
    context?: string;
    meta?: string;
}

const ATTR_ARIA_LABEL = "aria-label";
const TARGET_ARIA_LABEL = "ariaLabel";
const ROLE = "role";
const TYPE = "type";
const NAME = "name";
const ATTR_HREF = "href";
const ATTR_DATA_KEY = "data-key";
const SELECTOR_ANCHOR = "a[href]";
const FLAG = true;

const WHITESPACE_CHARS = [" ", "\t", "\n", "\r"] as const;

function collapseWhitespace(text: string): string {
    let normalized = text;
    for (const ch of WHITESPACE_CHARS) {
        normalized = normalized.split(ch).join(" ");
    }
    return normalized.split(" ").filter(Boolean).join(" ");
}

function extractText(el: HTMLElement): string {
    const aria = el.getAttribute(ATTR_ARIA_LABEL);
    if (aria && aria.trim()) return aria.trim();
    const normalized = collapseWhitespace(el.textContent ?? "");
    return normalized.slice(0, TEXT_PREVIEW_LENGTH);
}

function setIfPresent(state: ElementState, el: HTMLElement, attr: string, target: keyof ElementState): void {
    const v = el.getAttribute(attr);
    if (v && v.length > 0) (state as unknown as Record<string, unknown>)[target] = v;
}

function enrichInput(state: ElementState, el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    if (el.value) state.value = el.value;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.placeholder) state.placeholder = el.placeholder;
    }
    if (el.disabled) state.disabled = FLAG;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") && el.checked) {
        state.checked = FLAG;
    }
}

function resolveHref(el: HTMLElement): string | null {
    if (el instanceof HTMLAnchorElement) {
        const own = el.getAttribute(ATTR_HREF);
        if (own) return own;
    }
    const ancestor = el.closest(SELECTOR_ANCHOR);
    if (ancestor && ancestor !== el) {
        const inherited = ancestor.getAttribute(ATTR_HREF);
        if (inherited) return inherited;
    }
    const descendant = el.querySelector(SELECTOR_ANCHOR);
    if (descendant) {
        const child = descendant.getAttribute(ATTR_HREF);
        if (child) return child;
    }
    return null;
}

function snapshot(el: HTMLElement): ElementState {
    const rect = el.getBoundingClientRect();
    const state: ElementState = {
        tag: el.tagName.toLowerCase(),
        classes: el.className,
        text: extractText(el),
        visible: rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && !el.hidden,
    };
    setIfPresent(state, el, ATTR_ARIA_LABEL, TARGET_ARIA_LABEL);
    setIfPresent(state, el, ROLE, ROLE);
    setIfPresent(state, el, TYPE, TYPE);
    setIfPresent(state, el, NAME, NAME);
    if (el.hidden) state.hidden = FLAG;
    const href = resolveHref(el);
    if (href) state.href = href;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        enrichInput(state, el);
    }
    if (el instanceof HTMLButtonElement && el.disabled) state.disabled = FLAG;
    if (el.dataset.context) state.context = el.dataset.context;
    if (el.dataset.meta) state.meta = el.dataset.meta;
    return state;
}

function collectDomState(): Record<string, ElementState> {
    const state: Record<string, ElementState> = {};
    const seen = new Map<string, number>();
    for (const el of document.querySelectorAll<HTMLElement>(`[${ATTR_DATA_KEY}]`)) {
        const base = el.dataset.key;
        if (!base) continue;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        state[n === 1 ? base : `${base}${DEDUP_SEP}${n}`] = snapshot(el);
    }
    return state;
}

export { collectDomState };
export type { ElementState };
