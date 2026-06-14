import type { BuildSpec } from "./types.js";

const SEMANTIC_KEY_TAGS = new Set([
    "button",
    "input",
    "textarea",
    "select",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "label",
    "a",
    "form",
    "nav",
    "header",
    "footer",
    "section",
    "article",
    "aside",
    "main",
    "details",
    "summary",
]);
const KEY_HINT_MAX = 48;
const ASCII_0 = 48;
const ASCII_9 = 57;
const ASCII_A = 97;
const ASCII_Z = 122;

function sanitizeKey(text: string): string {
    let out = "";
    let pendingDash = false;
    const lower = text.toLowerCase();
    for (let i = 0; i < lower.length && out.length < KEY_HINT_MAX; i++) {
        const code = lower.charCodeAt(i);
        const isAlnum = (code >= ASCII_A && code <= ASCII_Z) || (code >= ASCII_0 && code <= ASCII_9);
        if (isAlnum) {
            if (pendingDash && out.length > 0) out += "-";
            out += lower[i];
            pendingDash = false;
        } else {
            pendingDash = true;
        }
    }
    return out;
}

function semanticHint(spec: BuildSpec): string | null {
    const aria = spec.attrs?.["aria-label"];
    if (typeof aria === "string" && aria.length > 0) return aria;
    const name = spec.attrs?.["name"];
    if (typeof name === "string" && name.length > 0) return name;
    const placeholder = spec.attrs?.["placeholder"];
    if (typeof placeholder === "string" && placeholder.length > 0) return placeholder;
    if (typeof spec.text === "string" && spec.text.length > 0) return spec.text;
    return null;
}

function isKeyable(spec: BuildSpec): boolean {
    return SEMANTIC_KEY_TAGS.has(spec.tag) || spec.onClick !== undefined || spec.onSubmit !== undefined;
}

export function autoKeyFor(spec: BuildSpec): string | null {
    if (!isKeyable(spec)) return null;
    const hint = semanticHint(spec);
    const slug = hint ? sanitizeKey(hint) : "";
    return slug.length > 0 ? `${spec.tag}-${slug}` : spec.tag;
}
