import { getClanPluginDb } from "../../../database/index.js";
import { scopeKeyForPlugin } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

const POSITION_COLUMNS = [
    "pcs.account_hash",
    "pcs.latest_rsn",
    "pcs.world",
    "pcs.activity",
    "pcs.login_state",
    "pcs.clan_rank",
    "pcs.location_x",
    "pcs.location_y",
    "pcs.location_plane",
    "pcs.location_region_id",
    "pcs.location_region_name",
    "pcs.interacting_kind",
    "pcs.interacting_id",
    "pcs.interacting_name",
    "pcs.hitpoints",
    "pcs.max_hitpoints",
    "pcs.prayer",
    "pcs.max_prayer",
    "pcs.last_seen_in_game",
    "pcs.last_damage_dealt_target_kind",
    "pcs.last_damage_dealt_target_name",
    "pcs.last_damage_dealt_amount",
    "pcs.last_damage_dealt_at",
    "pcs.last_damage_taken_source_kind",
    "pcs.last_damage_taken_source_name",
    "pcs.last_damage_taken_amount",
    "pcs.last_damage_taken_at",
    "(SELECT json_group_array(prayer_name) FROM (SELECT prayer_name FROM plugin_prayers WHERE account_hash = pcs.account_hash AND active = 1 ORDER BY prayer_id)) AS active_prayers",
].join(", ");

const POSITION_QUERY = `SELECT ${POSITION_COLUMNS} FROM plugin_current_state AS pcs WHERE pcs.login_state IS NOT NULL`;

export function positionsTopic(clanId: string, mode: string): ProjectionTopic {
    const scopeKey = scopeKeyForPlugin(clanId, mode);
    return {
        triggers: [
            { scopeKey, table: "plugin_current_state" },
            { scopeKey, table: "plugin_prayers" },
        ],
        query: () => getClanPluginDb(clanId, mode).prepare(POSITION_QUERY).all() as Record<string, unknown>[],
        keyOf: (row) => String(row.account_hash),
    };
}
