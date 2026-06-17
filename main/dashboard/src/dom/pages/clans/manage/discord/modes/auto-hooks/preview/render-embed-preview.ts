import { div, image, paragraph, span, type Instance } from "../../../../../../../factory";
import { buildSampleTokenMap } from "../../../../../../../../shared/constants/clan-manage-discord/token-list.js";
import {
    AUTO_HOOKS_PREVIEW_EMBED_BAR_CLASS,
    AUTO_HOOKS_PREVIEW_EMBED_CLASS,
    AUTO_HOOKS_PREVIEW_EMBED_DESC_CLASS,
    AUTO_HOOKS_PREVIEW_EMBED_TITLE_CLASS,
} from "../../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";
import type { PreviewState } from "./preview-state.js";
import { renderMarkdownNodes } from "./render-markdown.js";

const DEFAULT_COLOR = "#5865F2";

function substitute(template: string, tokenMap: Record<string, string>): string {
    let result = template;
    for (const [token, value] of Object.entries(tokenMap)) {
        result = result.split(token).join(value);
    }
    return result;
}

function maybeImage(url: string, alt: string, styleFn: (el: HTMLElement) => void): Instance | null {
    if (url.length === 0) return null;
    const img = image({ src: url, alt, classes: [], context: `${alt} embed image`, meta: ["data"] });
    styleFn(img.el);
    return img;
}

function buildAuthor(name: string, iconUrl: string): Instance | null {
    if (name.length === 0 && iconUrl.length === 0) return null;
    const children: Instance[] = [];
    const icon = maybeImage(iconUrl, "author icon", (el) => {
        el.style.inlineSize = "1rem";
        el.style.blockSize = "1rem";
        el.style.borderRadius = "50%";
        el.style.verticalAlign = "middle";
        el.style.marginInlineEnd = "0.25rem";
    });
    if (icon !== null) children.push(icon);
    if (name.length > 0) {
        const nameWrap = span({ classes: [], context: null, meta: null }, renderMarkdownNodes(name));
        children.push(nameWrap);
    }
    const wrap = div({ classes: [], context: null, meta: null }, children);
    wrap.el.style.fontSize = "var(--fs-3xs)";
    wrap.el.style.color = "var(--base-cream-100)";
    return wrap;
}

function buildFooter(text: string, iconUrl: string): Instance | null {
    if (text.length === 0 && iconUrl.length === 0) return null;
    const children: Instance[] = [];
    const icon = maybeImage(iconUrl, "footer icon", (el) => {
        el.style.inlineSize = "0.75rem";
        el.style.blockSize = "0.75rem";
        el.style.borderRadius = "50%";
        el.style.verticalAlign = "middle";
        el.style.marginInlineEnd = "0.25rem";
    });
    if (icon !== null) children.push(icon);
    if (text.length > 0) {
        const textWrap = span({ classes: [], context: null, meta: null }, renderMarkdownNodes(text));
        children.push(textWrap);
    }
    const wrap = div({ classes: [], context: null, meta: null }, children);
    wrap.el.style.fontSize = "var(--fs-3xs)";
    wrap.el.style.color = "var(--base-graphite-300)";
    wrap.el.style.paddingBlockStart = "0.25rem";
    return wrap;
}

export function renderEmbedPreview(state: PreviewState): Instance {
    const tokens = buildSampleTokenMap(state.triggerType);
    const bar = div({ classes: [AUTO_HOOKS_PREVIEW_EMBED_BAR_CLASS], context: null, meta: null });
    bar.el.style.backgroundColor = state.embedColor.length > 0 ? state.embedColor : DEFAULT_COLOR;
    const children: Instance[] = [bar];
    const author = buildAuthor(substitute(state.embedAuthorName, tokens), state.embedAuthorIconUrl);
    if (author !== null) children.push(author);
    if (state.embedTitle.length > 0) {
        const title = paragraph(
            {
                classes: [AUTO_HOOKS_PREVIEW_EMBED_TITLE_CLASS],
                context: null,
                meta: null,
            },
            renderMarkdownNodes(substitute(state.embedTitle, tokens)),
        );
        if (state.embedUrl.length > 0) title.el.style.color = "var(--base-gold-300)";
        children.push(title);
    }
    if (state.embedDescription.length > 0) {
        children.push(
            paragraph(
                {
                    classes: [AUTO_HOOKS_PREVIEW_EMBED_DESC_CLASS],
                    context: null,
                    meta: null,
                },
                renderMarkdownNodes(substitute(state.embedDescription, tokens)),
            ),
        );
    }
    const thumb = maybeImage(state.embedThumbnailUrl, "thumbnail", (el) => {
        el.style.position = "absolute";
        el.style.insetInlineEnd = "0.5rem";
        el.style.insetBlockStart = "0.5rem";
        el.style.inlineSize = "3rem";
        el.style.blockSize = "3rem";
        el.style.borderRadius = "var(--radius-sm)";
    });
    if (thumb !== null) children.push(thumb);
    const mainImg = maybeImage(state.embedImageUrl, "embed image", (el) => {
        el.style.maxInlineSize = "100%";
        el.style.borderRadius = "var(--radius-sm)";
    });
    if (mainImg !== null) children.push(mainImg);
    const footer = buildFooter(substitute(state.embedFooterText, tokens), state.embedFooterIconUrl);
    if (footer !== null) children.push(footer);
    return div({ classes: [AUTO_HOOKS_PREVIEW_EMBED_CLASS], context: null, meta: null }, children);
}
