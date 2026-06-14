import DOMPurify from "dompurify";

declare global {
    interface Window {
        trustedTypes?: {
            createPolicy(
                name: string,
                rules: { createHTML: (html: string) => string },
            ): { createHTML(html: string): string };
        };
    }
}

const ALLOWED_TAGS = [
    "p",
    "strong",
    "em",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "br",
    "hr",
    "img",
    "div",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "class", "data-key"];

function sanitize(html: string): string {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false });
}

const policy =
    typeof window === "undefined" || !window.trustedTypes
        ? null
        : window.trustedTypes.createPolicy("ai-content", { createHTML: sanitize });

export function trustHTML(html: string): string {
    return policy ? policy.createHTML(html) : sanitize(html);
}
