import type { AssetExtractor, ChildTable, UserTableByColumn } from "./types.js";

export const PLUGIN_USER_TABLES: UserTableByColumn[] = [
    // KEEP / REWRITE survivors
    { table: "plugin_accounts", column: "account_hash" },
    { table: "plugin_combat_achievements", column: "account_hash" },
    { table: "plugin_combat_achievements_changes", column: "account_hash" },
    { table: "plugin_connection_status", column: "account_hash" },
    { table: "plugin_current_state", column: "account_hash" },
    { table: "plugin_damage_buckets", column: "account_hash" },
    { table: "plugin_deaths", column: "account_hash" },
    { table: "plugin_identity_drifts", column: "account_hash" },
    { table: "plugin_login_state_transitions", column: "account_hash" },
    { table: "plugin_loot_drops", column: "account_hash" },
    { table: "plugin_npc_kc", column: "account_hash" },
    { table: "plugin_pet_drops", column: "account_hash" },
    { table: "plugin_sessions", column: "account_hash" },
    { table: "plugin_world_hops", column: "account_hash" },

    // PHASE 3 (cat A — item bag domain): state + changes pairs
    { table: "plugin_bank", column: "account_hash", browseOrder: ["bank_tab", "slot"] },
    { table: "plugin_bank_changes", column: "account_hash" },
    { table: "plugin_inventory", column: "account_hash", browseOrder: ["container_kind", "slot"] },
    { table: "plugin_inventory_changes", column: "account_hash" },
    { table: "plugin_equipment", column: "account_hash" },
    { table: "plugin_equipment_changes", column: "account_hash" },
    { table: "plugin_seed_vault", column: "account_hash" },
    { table: "plugin_seed_vault_changes", column: "account_hash" },
    { table: "plugin_collection_log", column: "account_hash" },
    { table: "plugin_collection_log_changes", column: "account_hash" },

    // PHASE 4 (cat B — stats / prayers / boosts)
    { table: "plugin_stats", column: "account_hash" },
    { table: "plugin_stats_changes", column: "account_hash" },
    { table: "plugin_prayers", column: "account_hash" },
    { table: "plugin_prayers_changes", column: "account_hash" },
    { table: "plugin_boosts", column: "account_hash" },
    { table: "plugin_boosts_changes", column: "account_hash" },

    // PHASE 5 (cat C — quests / diaries / clues)
    { table: "plugin_quests", column: "account_hash" },
    { table: "plugin_quests_changes", column: "account_hash" },
    { table: "plugin_diaries", column: "account_hash" },
    { table: "plugin_diaries_changes", column: "account_hash" },
    { table: "plugin_clues", column: "account_hash" },
    { table: "plugin_clues_changes", column: "account_hash" },

    // PHASE 6 (cat D — status_effects pair; deaths/loot/etc already above as REWRITE)
    { table: "plugin_status_effects", column: "account_hash" },
    { table: "plugin_status_effects_changes", column: "account_hash" },

    // PHASE 7 (cat E — farming / slayer)
    { table: "plugin_farming", column: "account_hash" },
    { table: "plugin_farming_changes", column: "account_hash" },
    { table: "plugin_slayer", column: "account_hash" },
    { table: "plugin_slayer_changes", column: "account_hash" },
];

export const PLUGIN_USER_CHILD_TABLES: ChildTable[] = [
    {
        table: "plugin_deaths_lost_items",
        parentTable: "plugin_deaths",
        parentColumn: "id",
        parentKey: "death_id",
    },
];

export const PLUGIN_ASSET_TABLES: AssetExtractor[] = [];

// AI query-gate only. Tables in plugin-<mode>.db that arent user-bound —
// shared lookup data (item names, CA task definitions). No account_hash column,
// no per-user filter. Data-rights doesnt export these (reference data, not
// user data); the AI gate exposes them at the catalog tier independent of
// the calling user's clan posture. See PLUGIN_USER_TABLES for the user-bound
// entries the same gate filters by posture (member → unfiltered, outsider →
// WHERE account_hash IN (user's hashes)).
export const PLUGIN_CATALOG_TABLES: readonly string[] = ["plugin_items_catalog", "plugin_combat_achievement_catalog"];
