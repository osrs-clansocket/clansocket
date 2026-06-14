import Database from "better-sqlite3";
import { existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { wrapDbForWrites } from "../../data-rights/streams/writes-watcher.js";
import { scopeKeyForClan, scopeKeyForClanAudit, scopeKeyForPlugin } from "../../data-rights/streams/writes-stream.js";
import { applyBootstrap } from "./database-bootstrap.js";
import {
    CLAN_AUDIT_DB_FILE,
    CLAN_AUDIT_SCHEMA_KEY,
    CLAN_DB_FILE,
    CLAN_SCHEMA_KEY,
    CLAN_VAULT_DB_FILE,
    CLAN_VAULT_SCHEMA_KEY,
    PLUGIN_DB_PREFIX,
    PLUGIN_SCHEMA_KEY,
    clanAuditDbKey,
    clanDbKey,
    clanDirPath,
    clanPluginDbKey,
    clanVaultDbKey,
    connections,
    ensureClanDirAbsolute,
} from "./database-state.js";

export function getClanDb(clanId: string): Database.Database {
    const key = clanDbKey(clanId);
    const cached = connections.get(key);
    if (cached) return cached;
    const dir = ensureClanDirAbsolute(clanId);
    const db = new Database(resolve(dir, CLAN_DB_FILE));
    applyBootstrap(db, CLAN_SCHEMA_KEY);
    wrapDbForWrites(db, scopeKeyForClan(clanId));
    connections.set(key, db);
    return db;
}

export function getClanAuditDb(clanId: string): Database.Database {
    const key = clanAuditDbKey(clanId);
    const cached = connections.get(key);
    if (cached) return cached;
    const dir = ensureClanDirAbsolute(clanId);
    const db = new Database(resolve(dir, CLAN_AUDIT_DB_FILE));
    applyBootstrap(db, CLAN_AUDIT_SCHEMA_KEY);
    wrapDbForWrites(db, scopeKeyForClanAudit(clanId));
    connections.set(key, db);
    return db;
}

export function getClanVaultDb(clanId: string): Database.Database {
    const key = clanVaultDbKey(clanId);
    const cached = connections.get(key);
    if (cached) return cached;
    const dir = ensureClanDirAbsolute(clanId);
    const db = new Database(resolve(dir, CLAN_VAULT_DB_FILE));
    applyBootstrap(db, CLAN_VAULT_SCHEMA_KEY);
    connections.set(key, db);
    return db;
}

export function getClanPluginDb(clanId: string, mode: string): Database.Database {
    const key = clanPluginDbKey(clanId, mode);
    const cached = connections.get(key);
    if (cached) return cached;
    const dir = ensureClanDirAbsolute(clanId);
    const db = new Database(resolve(dir, `${PLUGIN_DB_PREFIX}${mode}.db`));
    applyBootstrap(db, PLUGIN_SCHEMA_KEY);
    wrapDbForWrites(db, scopeKeyForPlugin(clanId, mode));
    connections.set(key, db);
    return db;
}

export function listClanPluginModes(clanId: string): string[] {
    const dir = clanDirPath(clanId);
    if (!existsSync(dir)) return [];
    const modes: string[] = [];
    for (const entry of readdirSync(dir)) {
        if (entry.startsWith(PLUGIN_DB_PREFIX) && entry.endsWith(".db")) {
            modes.push(entry.slice(PLUGIN_DB_PREFIX.length, -".db".length));
        }
    }
    return modes;
}

export function closeClanConnections(clanId: string): number {
    const prefix = `clan:${clanId}:`;
    let n = 0;
    for (const [key, db] of [...connections]) {
        if (!key.startsWith(prefix)) continue;
        try {
            db.close();
        } catch {}
        connections.delete(key);
        n += 1;
    }
    return n;
}
