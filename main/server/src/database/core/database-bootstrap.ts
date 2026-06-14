import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { dirname, resolve } from "path";
import { wrapDbForWrites } from "../../data-rights/streams/writes-watcher.js";
import { scopeKeyForBuiltin } from "../../data-rights/streams/writes-stream.js";
import {
    connections,
    DATA_DIR,
    DB_NAMES,
    dbPath,
    DISCORD_BOT_SCHEMA_KEY,
    DISCORD_RATE_LIMITS_SCHEMA_KEY,
    PLUGIN_DB_PREFIX,
    PLUGIN_SCHEMA_KEY,
    schemasDir,
    staticDbKey,
    staticDbPath,
} from "./database-state.js";

export function applySchemas(db: Database.Database, schemaKey: string): void {
    const dir = schemasDir(schemaKey);
    if (!existsSync(dir)) return;
    const files = readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    for (const file of files) {
        db.exec(readFileSync(resolve(dir, file), "utf-8"));
    }
}

export function applyBootstrap(db: Database.Database, schemaKey: string): void {
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 3000");
    db.pragma("foreign_keys = ON");
    applySchemas(db, schemaKey);
}

export function builtinSchemaKey(name: string): string {
    if (name === DB_NAMES.APP) return "clansocket";
    if (name === DB_NAMES.AI) return "varez";
    if (name === DB_NAMES.DISCORD_BOT) return DISCORD_BOT_SCHEMA_KEY;
    if (name === DB_NAMES.DISCORD_RATE_LIMITS) return DISCORD_RATE_LIMITS_SCHEMA_KEY;
    if (name.startsWith(PLUGIN_DB_PREFIX)) return PLUGIN_SCHEMA_KEY;
    return name;
}

export function openDb(name: string): Database.Database {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(dbPath(name));
    applyBootstrap(db, builtinSchemaKey(name));
    const wrapKey = scopeKeyForBuiltin(name);
    if (wrapKey) wrapDbForWrites(db, wrapKey);
    connections.set(name, db);
    return db;
}

export function openStaticDb(name: string): Database.Database {
    const key = staticDbKey(name);
    const cached = connections.get(key);
    if (cached) return cached;
    const dbFile = staticDbPath(name);
    mkdirSync(dirname(dbFile), { recursive: true });
    const db = new Database(dbFile);
    applyBootstrap(db, name);
    connections.set(key, db);
    return db;
}
