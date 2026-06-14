import type Database from "better-sqlite3";

export function listAllTablesInDb(db: Database.Database): string[] {
    return (
        db
            .prepare(
                `SELECT name FROM sqlite_master
                 WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'
                 ORDER BY name`,
            )
            .all() as { name: string }[]
    ).map((r) => r.name);
}

export function stripBlobs(rows: Record<string, unknown>[], blobCols: string[]): Record<string, unknown>[] {
    if (blobCols.length === 0) return rows;
    return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
            if (blobCols.includes(k)) continue;
            out[k] = v;
        }
        return out;
    });
}
