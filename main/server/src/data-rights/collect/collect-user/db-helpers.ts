import type Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { clanDirPath } from "../../../database/core/database.js";
import { DB_NAMES, getDb, listClanPluginModes } from "../../../database/index.js";
import type { ClanRowLite } from "./types.js";

export function listAllClans(): ClanRowLite[] {
    const db = getDb(DB_NAMES.APP);
    return db
        .prepare(`SELECT id, slug, display_name, status FROM clansocket_clans ORDER BY created_at`)
        .all() as ClanRowLite[];
}

export function selectAll(
    db: Database.Database,
    table: string,
    where: string,
    ...params: unknown[]
): Record<string, unknown>[] {
    return db.prepare(`SELECT * FROM ${table} WHERE ${where}`).all(...params) as Record<string, unknown>[];
}

export function stripBlobs(rows: Record<string, unknown>[], blobColumns: string[]): Record<string, unknown>[] {
    if (blobColumns.length === 0) return rows;
    return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
            if (blobColumns.includes(k)) continue;
            out[k] = v;
        }
        return out;
    });
}

export function pluginDirHasAnyDb(clanId: string): boolean {
    const dir = resolve(clanDirPath(clanId), "..");
    if (!existsSync(dir)) return false;
    return listClanPluginModes(clanId).length > 0;
}
