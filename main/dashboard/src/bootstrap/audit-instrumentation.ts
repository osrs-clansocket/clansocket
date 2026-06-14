import { recordClientClick, recordClientSubmit, startAuditClient } from "../state/clans/audit-client.js";

const LABEL_MAX = 80;
const ATTR_ARIA_LABEL = "aria-label";
const ATTR_TITLE = "title";
const KEY_AUDIT_PREFIX = "audit-";
const FIELD_RSN = "rsn";

function normalizeWhitespace(s: string): string {
    let result = "";
    let lastWasSpace = false;
    for (let i = 0; i < s.length; i += 1) {
        const ch = s.charAt(i);
        const isSpace = ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
        if (isSpace) {
            if (!lastWasSpace && result.length > 0) result += " ";
            lastWasSpace = true;
        } else {
            result += ch;
            lastWasSpace = false;
        }
    }
    return result.trim();
}

function attrOf(el: Element | null | undefined, name: string): string | undefined {
    if (!(el instanceof HTMLElement)) return undefined;
    return el.getAttribute(name) ?? undefined;
}

function deriveAuditLabel(el: HTMLElement, clickTarget?: Element | null): string | undefined {
    const sources = [
        attrOf(clickTarget, ATTR_ARIA_LABEL),
        attrOf(el, ATTR_ARIA_LABEL),
        attrOf(clickTarget, ATTR_TITLE),
        attrOf(el, ATTR_TITLE),
    ];
    for (const raw of sources) {
        if (!raw) continue;
        const trimmed = raw.trim();
        if (trimmed.length > 0) return trimmed.slice(0, LABEL_MAX);
    }
    const text = normalizeWhitespace(el.textContent ?? "");
    if (text.length === 0) return undefined;
    return text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1)}…` : text;
}

function readAuditKey(el: HTMLElement): string | undefined {
    const key = el.dataset.auditTarget;
    if (typeof key !== "string" || key.length === 0) return undefined;
    if (key.startsWith(KEY_AUDIT_PREFIX)) return undefined;
    return key;
}

function handleAuditClick(e: Event): void {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest<HTMLElement>("[data-audit-target]");
    if (!el) return;
    const key = readAuditKey(el);
    if (!key) return;
    recordClientClick(key, deriveAuditLabel(el, e.target));
}

function collectFormFields(form: HTMLFormElement): { fields: string[]; rsn?: string } {
    const fields: string[] = [];
    let rsn: string | undefined;
    for (const el of Array.from(form.elements)) {
        if (
            !(el instanceof HTMLInputElement) &&
            !(el instanceof HTMLTextAreaElement) &&
            !(el instanceof HTMLSelectElement)
        ) {
            continue;
        }
        if (el.name.length === 0) continue;
        fields.push(el.name);
        if (el.name === FIELD_RSN && el instanceof HTMLInputElement && el.value.length > 0) {
            rsn = el.value;
        }
    }
    return rsn === undefined ? { fields } : { fields, rsn };
}

function handleAuditSubmit(e: Event): void {
    if (!(e.target instanceof HTMLFormElement)) return;
    const form = e.target;
    const key = readAuditKey(form);
    if (!key) return;
    const collected = collectFormFields(form);
    const label = deriveAuditLabel(form);
    const meta: { fields: string[]; rsn?: string; label?: string } = collected;
    if (label !== undefined) meta.label = label;
    recordClientSubmit(key, meta);
}

export function attachAuditInstrumentation(): void {
    startAuditClient();
    document.addEventListener("click", handleAuditClick);
    document.addEventListener("submit", handleAuditSubmit, true);
}
