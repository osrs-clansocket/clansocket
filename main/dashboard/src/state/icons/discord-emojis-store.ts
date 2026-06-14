import { sameOriginFetch } from "../../shared/helpers/fetch-helper.js";

export interface DiscordEmojiEntry {
    bot_id: string;
    emoji_id: string;
    name: string;
    animated: number;
    public_path: string | null;
    updated_at: number;
}

let emojisByName: Map<string, DiscordEmojiEntry> | null = null;
let loadingPromise: Promise<void> | null = null;

async function loadFromServer(): Promise<void> {
    const res = await sameOriginFetch("/api/discord/emojis");
    if (!res.ok) {
        emojisByName = new Map();
        return;
    }
    const body = (await res.json()) as { emojis: DiscordEmojiEntry[] };
    const map = new Map<string, DiscordEmojiEntry>();
    for (const e of body.emojis ?? []) {
        if (!map.has(e.name)) map.set(e.name, e);
    }
    emojisByName = map;
}

export function ensureDiscordEmojisLoaded(): Promise<void> {
    if (emojisByName) return Promise.resolve();
    if (loadingPromise) return loadingPromise;
    loadingPromise = loadFromServer().finally(() => {
        loadingPromise = null;
    });
    return loadingPromise;
}

export function discordEmojiEntry(name: string): DiscordEmojiEntry | undefined {
    return emojisByName?.get(name);
}

export function discordEmojiUrl(name: string): string | null {
    const entry = emojisByName?.get(name);
    if (!entry) return null;
    const ext = entry.animated ? "gif" : "webp";
    return `https://cdn.discordapp.com/emojis/${entry.emoji_id}.${ext}`;
}

export function listDiscordEmojiNames(): readonly string[] {
    if (!emojisByName) return [];
    return Array.from(emojisByName.keys()).sort();
}
