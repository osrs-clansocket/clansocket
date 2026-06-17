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

export function listDiscordEmojiEntries(): readonly DiscordEmojiEntry[] {
    if (!emojisByName) return [];
    return Array.from(emojisByName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function publicPathOrCdn(entry: DiscordEmojiEntry): string {
    if (entry.public_path !== null && entry.public_path.length > 0) return entry.public_path;
    const ext = entry.animated ? "gif" : "webp";
    return `https://cdn.discordapp.com/emojis/${entry.emoji_id}.${ext}`;
}

const guildEmojiCache = new Map<string, readonly DiscordEmojiEntry[]>();

export async function listGuildEmojis(guildId: string): Promise<readonly DiscordEmojiEntry[]> {
    const cached = guildEmojiCache.get(guildId);
    if (cached !== undefined) return cached;
    const res = await sameOriginFetch(`/api/discord/emojis/by-guild/${encodeURIComponent(guildId)}`);
    if (!res.ok) {
        guildEmojiCache.set(guildId, []);
        return [];
    }
    const body = (await res.json()) as { emojis: DiscordEmojiEntry[] };
    const sorted = [...body.emojis].sort((a, b) => a.name.localeCompare(b.name));
    guildEmojiCache.set(guildId, sorted);
    return sorted;
}
