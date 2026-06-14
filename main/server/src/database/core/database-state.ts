import type Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(__dirname, "..", "..", "..", "data");

export const DB_NAMES = Object.freeze({
    DISCORD_BOT: "discord_bot",
    DISCORD_RATE_LIMITS: "discord_rate_limits",
    AI: "varez",
    APP: "clansocket",
});

export const STATIC_DB_NAMES = Object.freeze({
    GAME_IDS: "game_ids",
    WORLD_MAP: "world_map",
});

export const PLUGIN_DB_PREFIX = "plugin-";
export const PLUGIN_SCHEMA_KEY = "plugin";
export const CLAN_SCHEMA_KEY = "clan";
export const CLAN_AUDIT_SCHEMA_KEY = "clan_audit";
export const CLAN_VAULT_SCHEMA_KEY = "clan_vault";
export const CLANS_SUBDIR = "clans";
export const CLAN_DB_FILE = "clan.db";
export const CLAN_AUDIT_DB_FILE = "clan_audit.db";
export const CLAN_VAULT_DB_FILE = "clan_vault.db";

export const DISCORD_BOT_SCHEMA_KEY = "discord_bot";
export const DISCORD_RATE_LIMITS_SCHEMA_KEY = "discord_rate_limits";
export const DISCORD_GUILD_SCHEMA_KEY = "discord_guild";
export const DISCORD_GUILD_DB_PREFIX = "discord_guild_";

const STATIC_DB_SUBDIRS: Record<string, string> = {
    [STATIC_DB_NAMES.WORLD_MAP]: "map",
};

export const connections = new Map<string, Database.Database>();

export function schemasDir(schemaKey: string): string {
    return resolve(__dirname, "..", "schemas", schemaKey);
}

export function dbPath(name: string): string {
    return resolve(DATA_DIR, `${name}.db`);
}

export function staticDbPath(name: string): string {
    const subdir = STATIC_DB_SUBDIRS[name];
    if (subdir) return resolve(DATA_DIR, subdir, `${name}.db`);
    return resolve(DATA_DIR, `${name}.db`);
}

export function staticDbKey(name: string): string {
    return `static:${name}`;
}

export function clanDirPath(clanId: string): string {
    return resolve(DATA_DIR, CLANS_SUBDIR, clanId);
}

export function ensureClanDirAbsolute(clanId: string): string {
    const dir = clanDirPath(clanId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
}

export function clanDirRelPath(clanId: string): string {
    return `${CLANS_SUBDIR}/${clanId}`;
}

export function clanDbKey(clanId: string): string {
    return `clan:${clanId}:clan`;
}

export function clanAuditDbKey(clanId: string): string {
    return `clan:${clanId}:audit`;
}

export function clanVaultDbKey(clanId: string): string {
    return `clan:${clanId}:vault`;
}

export function clanPluginDbKey(clanId: string, mode: string): string {
    return `clan:${clanId}:${PLUGIN_DB_PREFIX}${mode}`;
}

export function discordGuildDbFile(guildId: string): string {
    return `${DISCORD_GUILD_DB_PREFIX}${guildId}.db`;
}

export function discordGuildDbKey(clanId: string, guildId: string): string {
    return `discord:${clanId}:guild:${guildId}`;
}
