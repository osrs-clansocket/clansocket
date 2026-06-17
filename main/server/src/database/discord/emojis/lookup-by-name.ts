import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

export interface AppEmojiHit {
    name: string;
    emoji_id: string;
    animated: number;
}

const SELECT_SQL = `SELECT name, emoji_id, animated
FROM discord_application_emojis
WHERE bot_id = ? AND name = ? COLLATE NOCASE
LIMIT 1`;

function lowercaseChar(ch: string): string {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(code + 32);
    return ch;
}

function normalizeWithUnderscores(input: string): string {
    let out = "";
    for (const c of input) {
        const code = c.charCodeAt(0);
        if ((code >= 48 && code <= 57) || (code >= 97 && code <= 122)) out += c;
        else if (code >= 65 && code <= 90) out += lowercaseChar(c);
        else if (c === " " || c === "-" || c === "_") out += "_";
    }
    return out;
}

function compactForm(normalized: string): string {
    let out = "";
    for (const c of normalized) if (c !== "_") out += c;
    return out;
}

const NAME_ALIASES: Record<string, string> = {
    hardcore_ironman: "hardcore",
    hardcoreironman: "hardcore",
    ultimate_ironman: "ultimate",
    ultimateironman: "ultimate",
    group_ironman: "regular_group_ironman",
    groupironman: "regular_group_ironman",
};

function runLookup(botId: string, candidate: string): AppEmojiHit | null {
    if (candidate.length === 0) return null;
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db.prepare(SELECT_SQL).get(botId, candidate) as AppEmojiHit | undefined;
    return row ?? null;
}

function tryAlias(botId: string, key: string): AppEmojiHit | null {
    const alias = NAME_ALIASES[key];
    if (alias === undefined) return null;
    return runLookup(botId, alias);
}

export function lookupAppEmojiByName(botId: string, name: string): AppEmojiHit | null {
    const direct = runLookup(botId, name);
    if (direct !== null) return direct;
    const normalized = normalizeWithUnderscores(name);
    if (normalized !== name) {
        const norm = runLookup(botId, normalized);
        if (norm !== null) return norm;
    }
    const compact = compactForm(normalized);
    if (compact.length > 0 && compact !== normalized) {
        const comp = runLookup(botId, compact);
        if (comp !== null) return comp;
    }
    const aliasNorm = tryAlias(botId, normalized);
    if (aliasNorm !== null) return aliasNorm;
    const aliasCompact = tryAlias(botId, compact);
    if (aliasCompact !== null) return aliasCompact;
    return null;
}
