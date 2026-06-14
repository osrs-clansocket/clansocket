import { getDb } from "./database.js";

export function insert(
    table: string,
    data: Record<string, unknown>,
    dbName: string,
): { lastInsertRowid: number; changes: number } {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
    const result = getDb(dbName)
        .prepare(sql)
        .run(...Object.values(data));
    return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.changes };
}

export function insertIgnore(
    table: string,
    data: Record<string, unknown>,
    dbName: string,
): { lastInsertRowid: number; changes: number } {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT OR IGNORE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
    const result = getDb(dbName)
        .prepare(sql)
        .run(...Object.values(data));
    return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.changes };
}

export function select(table: string, where: Record<string, unknown>, dbName: string): unknown {
    const keys = Object.keys(where);
    let sql = `SELECT * FROM ${table}`;
    if (keys.length > 0) {
        sql += ` WHERE ${keys.map((k) => `${k} = ?`).join(" AND ")}`;
    }
    return keys.length > 0
        ? getDb(dbName)
              .prepare(sql)
              .get(...Object.values(where))
        : getDb(dbName).prepare(sql).all();
}

export function deleteRows(table: string, where: Record<string, unknown>, dbName: string): { changes: number } {
    const keys = Object.keys(where);
    const sql = `DELETE FROM ${table} WHERE ${keys.map((k) => `${k} = ?`).join(" AND ")}`;
    const result = getDb(dbName)
        .prepare(sql)
        .run(...Object.values(where));
    return { changes: result.changes };
}

export function transaction<T>(fn: () => T, dbName: string): T {
    return getDb(dbName).transaction(fn)();
}
