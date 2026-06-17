import { image, span, type Instance } from "../../../../../../../factory";
import {
    discordEmojiEntry,
    publicPathOrCdn,
    type DiscordEmojiEntry,
} from "../../../../../../../../state/icons/discord-emojis-store.js";

type Node =
    | { kind: "text"; text: string }
    | { kind: "bold"; text: string }
    | { kind: "italic"; text: string }
    | { kind: "code"; text: string }
    | { kind: "link"; text: string; url: string }
    | { kind: "emoji"; id: string; name: string; animated: boolean; url: string | null }
    | { kind: "br" };

const BOLD_DELIM = "**";
const ITALIC_DELIM = "*";
const CODE_DELIM = "`";
const NEWLINE = "\n";
const LINK_OPEN = "[";
const LINK_MID = "](";
const LINK_CLOSE = ")";
const EMOJI_OPEN = "<";
const EMOJI_CLOSE = ">";
const EMOJI_SEP = ":";
const EMOJI_ANIMATED = "a";
const SPACE = " ";
const MAX_SHORTCODE_LENGTH = 32;
const MIN_SHORTCODE_LENGTH = 2;

const SKIP_SHORTCODE_VALUES: ReadonlySet<string> = new Set(["normal"]);

const SHORTCODE_NAME_ALIASES: Record<string, string> = {
    hardcore_ironman: "hardcore",
    hardcoreironman: "hardcore",
    ultimate_ironman: "ultimate",
    ultimateironman: "ultimate",
    group_ironman: "regular_group_ironman",
    groupironman: "regular_group_ironman",
};

function isDigitChar(charCode: number): boolean {
    return charCode >= 48 && charCode <= 57;
}

function isShortcodeNameChar(ch: string): boolean {
    const code = ch.charCodeAt(0);
    return (
        (code >= 48 && code <= 57) ||
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122) ||
        ch === "_" ||
        ch === "-" ||
        ch === " " ||
        ch === "'" ||
        ch === "."
    );
}

function lowercaseAscii(s: string): string {
    let out = "";
    for (const c of s) {
        const code = c.charCodeAt(0);
        out += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : c;
    }
    return out;
}

function normalizeWithUnderscores(input: string): string {
    let out = "";
    for (const c of input) {
        const code = c.charCodeAt(0);
        if ((code >= 48 && code <= 57) || (code >= 97 && code <= 122)) out += c;
        else if (code >= 65 && code <= 90) out += String.fromCharCode(code + 32);
        else if (c === " " || c === "-" || c === "_") out += "_";
    }
    return out;
}

function compactForm(normalized: string): string {
    let out = "";
    for (const c of normalized) if (c !== "_") out += c;
    return out;
}

function lookupShortcodeEmoji(name: string): DiscordEmojiEntry | null {
    const direct = discordEmojiEntry(name);
    if (direct !== undefined) return direct;
    const normalized = normalizeWithUnderscores(name);
    if (normalized !== name) {
        const norm = discordEmojiEntry(normalized);
        if (norm !== undefined) return norm;
    }
    const compact = compactForm(normalized);
    if (compact.length > 0 && compact !== normalized) {
        const comp = discordEmojiEntry(compact);
        if (comp !== undefined) return comp;
    }
    const aliasNorm = SHORTCODE_NAME_ALIASES[normalized];
    if (aliasNorm !== undefined) {
        const hit = discordEmojiEntry(aliasNorm);
        if (hit !== undefined) return hit;
    }
    const aliasCompact = SHORTCODE_NAME_ALIASES[compact];
    if (aliasCompact !== undefined) {
        const hit = discordEmojiEntry(aliasCompact);
        if (hit !== undefined) return hit;
    }
    return null;
}

function findDelimEnd(src: string, from: number, delim: string): number {
    let i = from;
    while (i < src.length) {
        if (src.startsWith(delim, i)) return i;
        i++;
    }
    return -1;
}

function tryParseLink(src: string, i: number): { node: Node; nextIdx: number } | null {
    if (src[i] !== LINK_OPEN) return null;
    const midIdx = src.indexOf(LINK_MID, i + 1);
    if (midIdx === -1) return null;
    const closeIdx = src.indexOf(LINK_CLOSE, midIdx + LINK_MID.length);
    if (closeIdx === -1) return null;
    const text = src.slice(i + 1, midIdx);
    const url = src.slice(midIdx + LINK_MID.length, closeIdx);
    return { node: { kind: "link", text, url }, nextIdx: closeIdx + 1 };
}

function tryParseEmoji(src: string, i: number): { node: Node; nextIdx: number } | null {
    if (src[i] !== EMOJI_OPEN) return null;
    let cursor = i + 1;
    let animated = false;
    if (src[cursor] === EMOJI_ANIMATED && src[cursor + 1] === EMOJI_SEP) {
        animated = true;
        cursor++;
    }
    if (src[cursor] !== EMOJI_SEP) return null;
    cursor++;
    const nameEnd = src.indexOf(EMOJI_SEP, cursor);
    if (nameEnd === -1) return null;
    const name = src.slice(cursor, nameEnd);
    if (name.length === 0) return null;
    const idStart = nameEnd + 1;
    const idEnd = src.indexOf(EMOJI_CLOSE, idStart);
    if (idEnd === -1) return null;
    const id = src.slice(idStart, idEnd);
    if (id.length === 0) return null;
    for (let k = 0; k < id.length; k++) {
        if (!isDigitChar(id.charCodeAt(k))) return null;
    }
    const cdnUrl = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "webp"}`;
    return { node: { kind: "emoji", id, name, animated, url: cdnUrl }, nextIdx: idEnd + 1 };
}

function findShortcodeEnd(src: string, start: number): number {
    const limit = Math.min(src.length, start + MAX_SHORTCODE_LENGTH + 1);
    for (let j = start; j < limit; j++) {
        if (src[j] === EMOJI_SEP) return j;
        if (!isShortcodeNameChar(src[j])) return -1;
    }
    return -1;
}

type ShortcodeResult = { kind: "node"; node: Node; nextIdx: number } | { kind: "skip"; nextIdx: number } | null;

function tryParseShortcode(src: string, i: number): ShortcodeResult {
    if (src[i] !== EMOJI_SEP || i + 1 >= src.length) return null;
    const nameStart = i + 1;
    const nameEnd = findShortcodeEnd(src, nameStart);
    if (nameEnd === -1 || nameEnd - nameStart < MIN_SHORTCODE_LENGTH) return null;
    const name = src.slice(nameStart, nameEnd);
    if (SKIP_SHORTCODE_VALUES.has(lowercaseAscii(name))) {
        let next = nameEnd + 1;
        if (src[next] === SPACE) next++;
        return { kind: "skip", nextIdx: next };
    }
    const hit = lookupShortcodeEmoji(name);
    if (hit === null) return null;
    return {
        kind: "node",
        node: {
            kind: "emoji",
            id: hit.emoji_id,
            name: hit.name,
            animated: hit.animated === 1,
            url: publicPathOrCdn(hit),
        },
        nextIdx: nameEnd + 1,
    };
}

function tryParseDelim(
    src: string,
    i: number,
    delim: string,
    kind: "bold" | "italic" | "code",
): { node: Node; nextIdx: number } | null {
    if (!src.startsWith(delim, i)) return null;
    const endIdx = findDelimEnd(src, i + delim.length, delim);
    if (endIdx === -1) return null;
    return { node: { kind, text: src.slice(i + delim.length, endIdx) }, nextIdx: endIdx + delim.length };
}

function tokenize(src: string): Node[] {
    const out: Node[] = [];
    let textBuf = "";
    let i = 0;
    function flushText(): void {
        if (textBuf.length > 0) {
            out.push({ kind: "text", text: textBuf });
            textBuf = "";
        }
    }
    while (i < src.length) {
        if (src[i] === NEWLINE) {
            flushText();
            out.push({ kind: "br" });
            i++;
            continue;
        }
        const emoji = tryParseEmoji(src, i);
        if (emoji !== null) {
            flushText();
            out.push(emoji.node);
            i = emoji.nextIdx;
            continue;
        }
        const shortcode = tryParseShortcode(src, i);
        if (shortcode !== null) {
            flushText();
            if (shortcode.kind === "node") out.push(shortcode.node);
            i = shortcode.nextIdx;
            continue;
        }
        const link = tryParseLink(src, i);
        if (link !== null) {
            flushText();
            out.push(link.node);
            i = link.nextIdx;
            continue;
        }
        const bold = tryParseDelim(src, i, BOLD_DELIM, "bold");
        if (bold !== null) {
            flushText();
            out.push(bold.node);
            i = bold.nextIdx;
            continue;
        }
        const italic = tryParseDelim(src, i, ITALIC_DELIM, "italic");
        if (italic !== null) {
            flushText();
            out.push(italic.node);
            i = italic.nextIdx;
            continue;
        }
        const code = tryParseDelim(src, i, CODE_DELIM, "code");
        if (code !== null) {
            flushText();
            out.push(code.node);
            i = code.nextIdx;
            continue;
        }
        textBuf += src[i];
        i++;
    }
    flushText();
    return out;
}

function buildEmojiNode(n: {
    kind: "emoji";
    id: string;
    name: string;
    animated: boolean;
    url: string | null;
}): Instance {
    const url = n.url ?? `https://cdn.discordapp.com/emojis/${n.id}.${n.animated ? "gif" : "webp"}`;
    const img = image({ src: url, alt: `:${n.name}:`, classes: [], context: `${n.name} emoji`, meta: ["data"] });
    img.el.style.display = "inline-block";
    img.el.style.inlineSize = "1.375em";
    img.el.style.blockSize = "1.375em";
    img.el.style.verticalAlign = "middle";
    img.el.style.objectFit = "contain";
    img.setAttr("title", `:${n.name}:`);
    return img;
}

function nodeToInstance(n: Node): Instance {
    if (n.kind === "text") return span({ classes: [], text: n.text, context: null, meta: null });
    if (n.kind === "bold") {
        const s = span({ classes: [], text: n.text, context: null, meta: null });
        s.el.style.fontWeight = "700";
        return s;
    }
    if (n.kind === "italic") {
        const s = span({ classes: [], text: n.text, context: null, meta: null });
        s.el.style.fontStyle = "italic";
        return s;
    }
    if (n.kind === "code") {
        const s = span({ classes: [], text: n.text, context: null, meta: null });
        s.el.style.fontFamily = "var(--ff-mono)";
        s.el.style.background = "rgb(from var(--base-graphite-900) r g b / 0.6)";
        s.el.style.padding = "0 0.25rem";
        s.el.style.borderRadius = "0.25rem";
        return s;
    }
    if (n.kind === "link") {
        const s = span({ classes: [], text: n.text, context: null, meta: null });
        s.el.style.color = "var(--base-gold-300)";
        s.el.style.textDecoration = "underline";
        s.setAttr("title", n.url);
        return s;
    }
    if (n.kind === "emoji") return buildEmojiNode(n);
    return span({ classes: [], text: "\n", context: null, meta: null });
}

export function renderMarkdownNodes(src: string): Instance[] {
    return tokenize(src).map(nodeToInstance);
}
