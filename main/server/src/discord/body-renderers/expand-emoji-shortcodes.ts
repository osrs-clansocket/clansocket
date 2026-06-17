import { lookupAppEmojiByName } from "../../database/discord/emojis/lookup-by-name.js";

const COLON = ":";
const SPACE = " ";
const LT = "<";
const GT = ">";
const MAX_NAME_LENGTH = 32;
const MIN_NAME_LENGTH = 2;
const MAX_DISCORD_NATIVE_LENGTH = 128;

const SKIP_SHORTCODE_VALUES: ReadonlySet<string> = new Set(["normal"]);

function isDiscordNativeStart(src: string, i: number): boolean {
    if (src[i] !== LT) return false;
    if (i + 1 >= src.length) return false;
    const next = src[i + 1];
    if (next === COLON || next === "@" || next === "#") return true;
    if ((next === "t" || next === "a") && src[i + 2] === COLON) return true;
    return false;
}

function findDiscordNativeEnd(src: string, start: number): number {
    const limit = Math.min(src.length, start + MAX_DISCORD_NATIVE_LENGTH);
    for (let j = start + 1; j < limit; j++) {
        if (src[j] === GT) return j;
        if (src[j] === LT) return -1;
    }
    return -1;
}

function lowercaseAscii(s: string): string {
    let out = "";
    for (const c of s) {
        const code = c.charCodeAt(0);
        out += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : c;
    }
    return out;
}

function isSkippableShortcode(name: string): boolean {
    return SKIP_SHORTCODE_VALUES.has(lowercaseAscii(name));
}

function isValidNameChar(ch: string): boolean {
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

function findShortcodeEnd(src: string, start: number): number {
    const limit = Math.min(src.length, start + MAX_NAME_LENGTH + 1);
    for (let j = start; j < limit; j++) {
        if (src[j] === COLON) return j;
        if (!isValidNameChar(src[j])) return -1;
    }
    return -1;
}

function buildEmojiSyntax(name: string, emojiId: string, animated: number): string {
    const prefix = animated === 1 ? "a" : "";
    return `<${prefix}:${name}:${emojiId}>`;
}

export function expandEmojiShortcodes(text: string, botId: string): string {
    let out = "";
    let i = 0;
    while (i < text.length) {
        if (isDiscordNativeStart(text, i)) {
            const closeIdx = findDiscordNativeEnd(text, i);
            if (closeIdx !== -1) {
                out += text.slice(i, closeIdx + 1);
                i = closeIdx + 1;
                continue;
            }
        }
        if (text[i] !== COLON || i + 1 >= text.length) {
            out += text[i];
            i++;
            continue;
        }
        const nameStart = i + 1;
        const nameEnd = findShortcodeEnd(text, nameStart);
        if (nameEnd === -1 || nameEnd - nameStart < MIN_NAME_LENGTH) {
            out += text[i];
            i++;
            continue;
        }
        const name = text.slice(nameStart, nameEnd);
        if (isSkippableShortcode(name)) {
            i = nameEnd + 1;
            if (text[i] === SPACE) i++;
            continue;
        }
        const hit = lookupAppEmojiByName(botId, name);
        if (hit !== null) {
            out += buildEmojiSyntax(hit.name, hit.emoji_id, hit.animated);
            i = nameEnd + 1;
        } else {
            out += `:${name}:`;
            i = nameEnd + 1;
        }
    }
    return out;
}
