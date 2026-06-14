import Database from "better-sqlite3";
import { resolve } from "path";
import { scopeKeyForDiscordGuild } from "../../data-rights/streams/writes-stream.js";
import { wrapDbForWrites } from "../../data-rights/streams/writes-watcher.js";
import { applyBootstrap } from "../core/database-bootstrap.js";
import {
    DISCORD_GUILD_SCHEMA_KEY,
    connections,
    discordGuildDbFile,
    discordGuildDbKey,
    ensureClanDirAbsolute,
} from "../core/database-state.js";

export function getDiscordGuildDb(clanId: string, guildId: string): Database.Database {
    const key = discordGuildDbKey(clanId, guildId);
    const cached = connections.get(key);
    if (cached) return cached;
    const dir = ensureClanDirAbsolute(clanId);
    const db = new Database(resolve(dir, discordGuildDbFile(guildId)));
    applyBootstrap(db, DISCORD_GUILD_SCHEMA_KEY);
    wrapDbForWrites(db, scopeKeyForDiscordGuild(clanId, guildId));
    connections.set(key, db);
    return db;
}
