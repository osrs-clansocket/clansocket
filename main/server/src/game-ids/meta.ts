import { getStaticDb, STATIC_DB_NAMES } from "../database/index.js";

const META_QUERY =
    "SELECT item_count, object_count, npc_count, cache_id, cache_timestamp, built_at" +
    " FROM game_ids_meta WHERE id = 1";

export interface GameIdsMeta {
    item_count: number;
    object_count: number;
    npc_count: number;
    cache_id: number | null;
    cache_timestamp: string | null;
    built_at: number;
}

export function getGameIdsMeta(): GameIdsMeta {
    return getStaticDb(STATIC_DB_NAMES.GAME_IDS).prepare(META_QUERY).get() as GameIdsMeta;
}
