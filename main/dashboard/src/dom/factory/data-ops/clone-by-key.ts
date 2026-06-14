import { DEDUP_SEP } from "../../../ai/actions/action-types.js";

const KEY_ATTR = "data-key";
const CLONED_KEY_ATTR = "data-ai-clone";
const ID_ATTR = "id";
const CLONED_ID_ATTR = "data-ai-cloned-id";
const MISSING_CLASS = "ai-bar__missing-ref";
const CHAR_A_LOWER = 97;
const CHAR_Z_LOWER = 122;
const CHAR_0 = 48;
const CHAR_9 = 57;
const CHAR_DASH = 45;
const CHAR_HASH = 35;
const NOT_FOUND = -1;
const FIRST_INDEX = 1;
const DEFAULT_INDEX = 1;

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

function escapeHtml(s: string): string {
    let out = "";
    for (let i = 0; i < s.length; i++) {
        const c = s.charAt(i);
        out += HTML_ESCAPES[c] ?? c;
    }
    return out;
}

function inRange(code: number, lo: number, hi: number): boolean {
    return code >= lo && code <= hi;
}

function isLowerAscii(code: number): boolean {
    return inRange(code, CHAR_A_LOWER, CHAR_Z_LOWER);
}

function isDigitAscii(code: number): boolean {
    return inRange(code, CHAR_0, CHAR_9);
}

function isValidKeyChar(code: number): boolean {
    return isLowerAscii(code) || isDigitAscii(code) || code === CHAR_DASH;
}

function isAtEnd(s: string, i: number): boolean {
    return i >= s.length;
}

export function isValidDataKey(s: string): boolean {
    if (s.length === 0) return false;
    if (!isLowerAscii(s.charCodeAt(0))) return false;
    let i = FIRST_INDEX;
    while (!isAtEnd(s, i) && s.charCodeAt(i) !== CHAR_HASH) {
        if (!isValidKeyChar(s.charCodeAt(i))) return false;
        i++;
    }
    if (isAtEnd(s, i)) return true;
    i++;
    if (isAtEnd(s, i)) return false;
    while (!isAtEnd(s, i)) {
        if (!isDigitAscii(s.charCodeAt(i))) return false;
        i++;
    }
    return true;
}

function parseKey(key: string): { base: string; index: number } {
    const hashIdx = key.indexOf(DEDUP_SEP);
    if (hashIdx === NOT_FOUND) return { base: key, index: DEFAULT_INDEX };
    const base = key.slice(0, hashIdx);
    const n = Number(key.slice(hashIdx + 1));
    return { base, index: Number.isFinite(n) && n > 0 ? n : DEFAULT_INDEX };
}

const VISIT_PAGE_CLASS = "ai-bar__visit-page";
const VISIT_PAGE_LABEL = "Visit page";

export function missingRef(key: string): string {
    return `<i class="${MISSING_CLASS}">Δ${escapeHtml(key)}Δ</i>`;
}

export function visitPagePlaceholder(deepLink: string, key: string): string {
    return `<a class="${VISIT_PAGE_CLASS}" href="${escapeHtml(deepLink)}" data-route ${CLONED_KEY_ATTR}="${escapeHtml(key)}">${VISIT_PAGE_LABEL}</a>`;
}

function swapAttr(el: HTMLElement, from: string, to: string): void {
    const value = el.getAttribute(from);
    if (value === null || value.length === 0) return;
    el.removeAttribute(from);
    el.setAttribute(to, value);
}

function swapKey(el: HTMLElement): void {
    swapAttr(el, KEY_ATTR, CLONED_KEY_ATTR);
}

function swapId(el: HTMLElement): void {
    swapAttr(el, ID_ATTR, CLONED_ID_ATTR);
}

function applyToSubtree(root: HTMLElement, selector: string, fn: (el: HTMLElement) => void): void {
    fn(root);
    for (const el of root.querySelectorAll<HTMLElement>(selector)) fn(el);
}

function unhideRoot(clone: HTMLElement, original: HTMLElement): void {
    clone.removeAttribute("hidden");
    if (clone.style.display === "none") clone.style.removeProperty("display");
    if (getComputedStyle(original).display === "none") {
        clone.style.setProperty("display", "revert", "important");
    }
}

export function tryCloneByKey(key: string): string | null {
    if (!isValidDataKey(key)) return null;
    const { base, index } = parseKey(key);
    const matches = document.querySelectorAll<HTMLElement>(`[${KEY_ATTR}="${base}"]`);
    const el = matches[index - 1];
    if (el === undefined) return null;
    const clone = el.cloneNode(true) as HTMLElement;
    unhideRoot(clone, el);
    applyToSubtree(clone, `[${KEY_ATTR}]`, swapKey);
    applyToSubtree(clone, `[${ID_ATTR}]`, swapId);
    return clone.outerHTML;
}

export function cloneByKey(key: string): string {
    return tryCloneByKey(key) ?? missingRef(key);
}
