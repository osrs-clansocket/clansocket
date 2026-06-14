import type Database from "better-sqlite3";

export function getOne<T>(db: Database.Database, sql: string, ...params: unknown[]): T | null {
    const row = db.prepare(sql).get(...params) as T | undefined;
    return row ?? null;
}

export function getMany<T>(db: Database.Database, sql: string, ...params: unknown[]): T[] {
    return db.prepare(sql).all(...params) as T[];
}

export function exists(db: Database.Database, sql: string, ...params: unknown[]): boolean {
    return db.prepare(sql).get(...params) !== undefined;
}

export function runMutation(db: Database.Database, sql: string, ...params: unknown[]): boolean {
    const result = db.prepare(sql).run(...params);
    return result.changes > 0;
}

export function execMutation(db: Database.Database, sql: string, ...params: unknown[]): void {
    db.prepare(sql).run(...params);
}

export function placeholdersFor(n: number): string {
    return Array(n).fill("?").join(",");
}
