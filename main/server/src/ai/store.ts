import { getDb, DB_NAMES } from "../database/core/database.js";

const TABLE = "varez_state";

export function storeGet(key: string): string | null {
    const row = getDb(DB_NAMES.AI).prepare(`SELECT value FROM ${TABLE} WHERE key = ?`).get(key) as
        | { value: string }
        | undefined;
    return row?.value ?? null;
}

export function storeSet(key: string, value: string): void {
    getDb(DB_NAMES.AI)
        .prepare(`INSERT OR REPLACE INTO ${TABLE} (key, value, updated_at) VALUES (?, ?, ?)`)
        .run(key, value, Date.now());
}

export function storeRemove(key: string): void {
    getDb(DB_NAMES.AI).prepare(`DELETE FROM ${TABLE} WHERE key = ?`).run(key);
}
