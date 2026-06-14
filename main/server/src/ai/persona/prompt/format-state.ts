import type { DomElement } from "./types.js";

export function formatStateFull(state: Record<string, unknown>): string {
    const lines: string[] = ["Full page state — all data-key elements with complete untruncated content:\n"];
    for (const [key, el] of Object.entries(state)) {
        const elem = el as DomElement;
        const vis = elem.visible ? "visible" : "hidden";
        lines.push(`[${key}] <${elem.tag}> class="${elem.classes}" (${vis})`);
        if (elem.text) {
            lines.push(elem.text);
        } else {
            lines.push("(empty)");
        }
        lines.push("");
    }
    return lines.join("\n");
}

const META_FACET_PREFIX = "dom:";

export function metaFacetPrefix(): string {
    return META_FACET_PREFIX;
}

function metaTagsOf(el: DomElement): string[] {
    return el.meta ? el.meta.split(" ").filter(Boolean) : [];
}

export function formatMetaIndex(state: Record<string, unknown>): string {
    const index = new Map<string, string[]>();
    for (const [key, raw] of Object.entries(state)) {
        for (const tag of metaTagsOf(raw as DomElement)) {
            const keys = index.get(tag) ?? [];
            keys.push(key);
            index.set(tag, keys);
        }
    }
    if (index.size === 0) return "No operable elements on the current page.";
    const lines: string[] = [
        'Operable element index — meta-tag → (count) keys. Pull a facet\'s full context with read: ["dom:<tag>"].',
    ];
    for (const [tag, keys] of [...index.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        lines.push(`  ${tag} (${keys.length}): ${keys.join(", ")}`);
    }
    return lines.join("\n");
}

export function formatMetaFacet(state: Record<string, unknown>, tag: string): string {
    const lines: string[] = [];
    for (const [key, raw] of Object.entries(state)) {
        const el = raw as DomElement;
        if (!metaTagsOf(el).includes(tag)) continue;
        const vis = el.visible ? "visible" : "hidden";
        const extras: string[] = [];
        if (el.value) extras.push(`value="${el.value}"`);
        if (el.placeholder) extras.push(`placeholder="${el.placeholder}"`);
        if (el.checked) extras.push("checked");
        if (el.disabled) extras.push("disabled");
        if (el.href) extras.push(`href=${el.href}`);
        const suffix = extras.length > 0 ? ` ${extras.join(" ")}` : "";
        const ctx = el.context ? ` — ${el.context}` : "";
        lines.push(`  [${key}] <${el.tag}> (${vis})${suffix}${ctx}`);
    }
    if (lines.length === 0) return `No operable elements tagged "${tag}" on the current page.`;
    return [`Operable elements tagged "${tag}" — data-key, current state, and what you can do:`, ...lines].join("\n");
}
