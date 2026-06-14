import type Database from "better-sqlite3";
import { existsSync, readdirSync } from "fs";
import { openDb, openStaticDb } from "./database-bootstrap.js";
import { connections, DATA_DIR, DB_NAMES, PLUGIN_DB_PREFIX, staticDbKey } from "./database-state.js";

export {
    DB_NAMES,
    PLUGIN_DB_PREFIX,
    STATIC_DB_NAMES,
    clanDirPath,
    clanDirRelPath,
    ensureClanDirAbsolute,
} from "./database-state.js";

export {
    closeClanConnections,
    getClanAuditDb,
    getClanDb,
    getClanPluginDb,
    listClanPluginModes,
} from "./database-clans.js";

export { getDiscordGuildDb } from "../discord/database-discord.js";

function openExistingPluginDbs(): void {
    if (!existsSync(DATA_DIR)) return;
    const entries = readdirSync(DATA_DIR);
    for (const entry of entries) {
        if (!entry.startsWith(PLUGIN_DB_PREFIX) || !entry.endsWith(".db")) continue;
        const name = entry.slice(0, -".db".length);
        if (!connections.has(name)) openDb(name);
    }
}

export function initializeDatabase(): void {
    for (const name of Object.values(DB_NAMES)) {
        if (!connections.has(name)) openDb(name);
    }
    openExistingPluginDbs();
}

export function closeDatabase(): void {
    for (const [name, db] of connections) {
        db.close();
        connections.delete(name);
    }
}

export function getDb(name: string): Database.Database {
    const db = connections.get(name);
    if (!db) throw new Error(`Database "${name}" not initialized`);
    return db;
}

export function getStaticDb(name: string): Database.Database {
    const key = staticDbKey(name);
    const cached = connections.get(key);
    if (cached) return cached;
    return openStaticDb(name);
}

export function isDatabaseReady(): boolean {
    return connections.size > 0;
}

export function getPluginDb(mode: string): Database.Database {
    const name = `${PLUGIN_DB_PREFIX}${mode}`;
    let db = connections.get(name);
    if (!db) db = openDb(name);
    return db;
}

export function listOpenPluginModes(): string[] {
    const modes: string[] = [];
    for (const name of connections.keys()) {
        if (name.startsWith(PLUGIN_DB_PREFIX)) modes.push(name.slice(PLUGIN_DB_PREFIX.length));
    }
    return modes;
}
