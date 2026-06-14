import { getStaticDb, placeholdersFor, STATIC_DB_NAMES } from "../database/index.js";

const NPC_ONE = "SELECT npc_id, name FROM npcs WHERE npc_id = ?";

export interface GameNpc {
    npc_id: number;
    name: string;
}

export function lookupNpc(id: number): GameNpc | null {
    return (getStaticDb(STATIC_DB_NAMES.GAME_IDS).prepare(NPC_ONE).get(id) as GameNpc | undefined) ?? null;
}

export function lookupNpcs(ids: readonly number[]): Map<number, GameNpc> {
    const out = new Map<number, GameNpc>();
    if (ids.length === 0) return out;
    const sql = `SELECT npc_id, name FROM npcs WHERE npc_id IN (${placeholdersFor(ids.length)})`;
    const rows = getStaticDb(STATIC_DB_NAMES.GAME_IDS)
        .prepare(sql)
        .all(...ids) as GameNpc[];
    for (const row of rows) out.set(row.npc_id, row);
    return out;
}
