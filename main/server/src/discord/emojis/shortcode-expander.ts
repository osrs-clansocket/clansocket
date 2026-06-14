import { listAllEmojis } from "../../database/discord/emojis/list.js";

const SHORTCODE_DELIMITER = ":";
const ANIMATED_TRUE = 1;

interface CachedEmoji {
    id: string;
    animated: boolean;
}

let cache: Map<string, CachedEmoji> | null = null;

function ensureCache(): Map<string, CachedEmoji> {
    if (cache) return cache;
    const next = new Map<string, CachedEmoji>();
    for (const e of listAllEmojis()) {
        next.set(e.name, { id: e.emoji_id, animated: e.animated === ANIMATED_TRUE });
    }
    cache = next;
    return next;
}

export function flushExpandShortcodesCache(): void {
    cache = null;
}

function tryExpandAt(
    text: string,
    start: number,
    lookup: Map<string, CachedEmoji>,
): { rendered: string; next: number } | null {
    const end = text.indexOf(SHORTCODE_DELIMITER, start + 1);
    if (end <= start + 1) return null;
    const name = text.slice(start + 1, end);
    const entry = lookup.get(name);
    if (!entry) return null;
    const prefix = entry.animated ? "a" : "";
    return { rendered: `<${prefix}:${name}:${entry.id}>`, next: end + 1 };
}

export function expandShortcodes(text: string): string {
    const lookup = ensureCache();
    let result = "";
    let i = 0;
    while (i < text.length) {
        if (text[i] === SHORTCODE_DELIMITER) {
            const expansion = tryExpandAt(text, i, lookup);
            if (expansion) {
                result += expansion.rendered;
                i = expansion.next;
                continue;
            }
        }
        result += text[i];
        i++;
    }
    return result;
}
