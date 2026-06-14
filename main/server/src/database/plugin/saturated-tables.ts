export interface SaturatedColumn {
    table: string;
    rsnColumn: string;
    hashColumn: string;
}

export const PLUGIN_NEW_RSN_TABLES: readonly string[] = [
    "plugin_bank",
    "plugin_bank_changes",
    "plugin_boosts",
    "plugin_boosts_changes",
    "plugin_clues",
    "plugin_clues_changes",
    "plugin_collection_log",
    "plugin_collection_log_changes",
    "plugin_combat_achievements",
    "plugin_combat_achievements_changes",
    "plugin_connection_status",
    "plugin_damage_buckets",
    "plugin_deaths",
    "plugin_diaries",
    "plugin_diaries_changes",
    "plugin_equipment",
    "plugin_equipment_changes",
    "plugin_farming",
    "plugin_farming_changes",
    "plugin_identity_drifts",
    "plugin_inventory",
    "plugin_inventory_changes",
    "plugin_login_state_transitions",
    "plugin_loot_drops",
    "plugin_npc_kc",
    "plugin_pet_drops",
    "plugin_prayers",
    "plugin_prayers_changes",
    "plugin_quests",
    "plugin_quests_changes",
    "plugin_seed_vault",
    "plugin_seed_vault_changes",
    "plugin_sessions",
    "plugin_slayer",
    "plugin_slayer_changes",
    "plugin_stats",
    "plugin_stats_changes",
    "plugin_status_effects",
    "plugin_status_effects_changes",
    "plugin_world_hops",
];

export const PLUGIN_SATURATED: readonly SaturatedColumn[] = [
    ...PLUGIN_NEW_RSN_TABLES.map((table) => ({
        table,
        rsnColumn: "rsn",
        hashColumn: "account_hash",
    })),
    { table: "plugin_accounts", rsnColumn: "latest_rsn", hashColumn: "account_hash" },
    { table: "plugin_current_state", rsnColumn: "latest_rsn", hashColumn: "account_hash" },
];

export const CLANSOCKET_SATURATED: readonly SaturatedColumn[] = [
    { table: "clansocket_account_bindings", rsnColumn: "rsn", hashColumn: "account_hash" },
    { table: "clansocket_clans", rsnColumn: "owner_rsn", hashColumn: "owner_account_hash" },
];

export const CLAN_SATURATED: readonly SaturatedColumn[] = [
    { table: "clan_chats", rsnColumn: "rsn", hashColumn: "account_hash" },
    { table: "clan_member_history", rsnColumn: "rsn", hashColumn: "account_hash" },
    { table: "clan_rosters", rsnColumn: "captured_by_rsn", hashColumn: "captured_by_account_hash" },
    { table: "clan_snapshots", rsnColumn: "rsn", hashColumn: "account_hash" },
    { table: "clan_titles_current", rsnColumn: "rsn", hashColumn: "account_hash" },
    { table: "clan_titles_history", rsnColumn: "rsn", hashColumn: "account_hash" },
];

export const NAME_CHANGED_SUFFIX = "_name-changed";
