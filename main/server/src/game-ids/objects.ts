import { getStaticDb, placeholdersFor, STATIC_DB_NAMES } from "../database/index.js";

const OBJECT_ONE = "SELECT object_id, name FROM objects WHERE object_id = ?";

export interface GameObject {
    object_id: number;
    name: string;
}

export function lookupObject(id: number): GameObject | null {
    return (getStaticDb(STATIC_DB_NAMES.GAME_IDS).prepare(OBJECT_ONE).get(id) as GameObject | undefined) ?? null;
}

export function lookupObjects(ids: readonly number[]): Map<number, GameObject> {
    const out = new Map<number, GameObject>();
    if (ids.length === 0) return out;
    const sql = `SELECT object_id, name FROM objects WHERE object_id IN (${placeholdersFor(ids.length)})`;
    const rows = getStaticDb(STATIC_DB_NAMES.GAME_IDS)
        .prepare(sql)
        .all(...ids) as GameObject[];
    for (const row of rows) out.set(row.object_id, row);
    return out;
}
