import { getStaticDb, placeholdersFor, STATIC_DB_NAMES } from "../database/index.js";

const ITEM_COLS = "item_id, name, stackable, tradeable, noted, linked_note_id";
const ITEM_ONE = `SELECT ${ITEM_COLS} FROM items WHERE item_id = ?`;

export interface GameItem {
    item_id: number;
    name: string;
    stackable: number;
    tradeable: number;
    noted: number;
    linked_note_id: number;
}

export function lookupItem(id: number): GameItem | null {
    return (getStaticDb(STATIC_DB_NAMES.GAME_IDS).prepare(ITEM_ONE).get(id) as GameItem | undefined) ?? null;
}

export function lookupItems(ids: readonly number[]): Map<number, GameItem> {
    const out = new Map<number, GameItem>();
    if (ids.length === 0) return out;
    const sql = `SELECT ${ITEM_COLS} FROM items WHERE item_id IN (${placeholdersFor(ids.length)})`;
    const rows = getStaticDb(STATIC_DB_NAMES.GAME_IDS)
        .prepare(sql)
        .all(...ids) as GameItem[];
    for (const row of rows) out.set(row.item_id, row);
    return out;
}
