export interface TableSummary {
    primary: string;
    secondary: string;
    updated: string;
}

export interface TableMeta {
    label: string;
    icon: string;
    assetPath?: string;
    summary?: TableSummary;
}

function entry(label: string, icon: string, fields?: readonly string[], assetPath?: string): TableMeta {
    const base: TableMeta = { label, icon };
    if (assetPath !== undefined) base.assetPath = assetPath;
    if (!fields || fields.length === 0) return base;
    base.summary = { primary: fields[0], secondary: fields[1] ?? "", updated: fields[2] ?? "" };
    return base;
}

const ASSET_VAULT = "/resources/osrs/game_storage/vault.webp";
const ASSET_INVENTORY = "/resources/osrs/game_tab/equipment.webp";
const ASSET_EQUIPMENT = "/resources/osrs/game_equipment/slot_weapon.webp";
const ASSET_FARMING = "/resources/osrs/game_skill/farming.webp";
const ASSET_SLAYER = "/resources/osrs/game_skill/slayer.webp";
const ASSET_PRAYER = "/resources/osrs/game_prayer/icon_small.webp";
const ASSET_CA = "/resources/osrs/game_combat_achievements/dragon_sword.webp";
const ASSET_PET = "/resources/osrs/icon_pets/baby_chinchompa.webp";
const ASSET_LOOT = "/resources/osrs/icon_item_ids/995.webp";
const ASSET_NPC = "/resources/osrs/icon_hiscores/abyssal_sire.webp";
const ASSET_DIARY = "/resources/osrs/game_tab/quests_green_achievement_diaries.webp";
const ASSET_QUEST = "/resources/osrs/game_tab/quests.webp";
const ASSET_CLAN_CHAT = "/resources/osrs/game_tab/clan_chat.webp";
const ASSET_PLAYER_TYPE = "/resources/osrs/icon_player_types/regular.webp";
const ASSET_STATS = "/resources/osrs/icon_skills_enlarged/overall_xl.webp";

const TABLE_META: Record<string, TableMeta> = {
    clansocket_accounts: entry("account", "person-circle", ["display_name", "provider", "last_login_at"]),
    clansocket_account_bindings: entry("account links", "link-45deg", ["rsn", "account_hash", "last_seen_at"]),
    clansocket_account_rsns: entry("RSNs", "person-badge", ["rsn", "current_rank", "last_seen"], ASSET_PLAYER_TYPE),
    clansocket_account_providers: entry("OAuth providers", "box-arrow-in-right", [
        "provider",
        "display_name",
        "linked_at",
    ]),
    clansocket_oauth_sessions: entry("sessions", "shield-lock", ["ip", "user_agent", "last_used_at"]),
    clansocket_passkeys: entry("passkeys", "key", ["device_name", "sign_count", "last_used_at"]),
    clansocket_backup_codes: entry("backup codes", "shield-check", ["generated_at", "redeemed_at"]),
    clansocket_device_link_codes: entry("device link codes", "phone", ["created_at", "redeemed_at", "expires_at"]),
    clansocket_webauthn_challenges: entry("auth challenges", "shield-shaded", [
        "purpose",
        "display_name",
        "created_at",
    ]),
    clansocket_clans: entry("owned clans", "people-fill", ["display_name", "status", "created_at"]),
    clansocket_clan_managers: entry("manager roles", "award", ["clan_name", "role", "granted_at"]),
    clansocket_clan_manager_requests: entry("manager requests", "send", ["clan_name", "declared_rsn", "requested_at"]),
    clansocket_clan_whitelists: entry("clan whitelists", "list-check", ["clan_name", "entry_value", "added_at"]),
    clansocket_consent_requests: entry("consent requests", "file-text", ["target_rsn", "kind", "created_at"]),
    clansocket_notifications: entry("notifications", "bell", ["title", "kind", "created_at"]),
    clansocket_data_action_log: entry("action log", "clock-history", ["kind", "target_name", "performed_at"]),

    varez_chain_turns: entry("AI chain turns", "arrow-repeat", ["step", "mode", "started_at"]),
    varez_pins: entry("AI pins", "pin-angle", ["pin_id", "auto", "pinned_at"]),
    varez_user_action_log: entry("AI actions", "activity", ["action", "target", "executed_at"]),
    varez_action_log: entry("AI action log", "activity", ["action", "target", "executed_at"]),
    varez_state: entry("AI state", "sliders", ["key", "value", "updated_at"]),

    discord_users: entry("discord user", "discord", ["user_id", "guild_id", "created_at"]),
    discord_audit_logs: entry("discord audit", "clipboard-check", ["action", "user_id", "timestamp"]),
    discord_rate_limits: entry("rate limits", "speedometer2", ["identifier", "count", "reset_time"]),
    discord_servers: entry("discord servers", "hdd-network", ["guild_id", "config", "updated_at"]),

    clan_rosters: entry("roster snapshots", "camera", ["captured_by_rsn", "member_count", "captured_at"]),
    clan_members: entry("clan members", "people", ["member_name", "rank", "last_observed_at"]),
    clan_roster_diffs: entry("roster changes", "arrow-left-right", ["member_name", "event_type", "detected_at"]),
    clan_invites: entry("clan invites", "envelope-paper", ["code", "role", "created_at"]),
    clan_invite_redemptions: entry("redemptions", "envelope-open", [
        "code",
        "redeemed_by_site_account_id",
        "redeemed_at",
    ]),
    clan_settings: entry("clan settings", "gear", ["key", "value", "updated_at"]),
    clan_eligibility_rules: entry("eligibility rules", "funnel", [
        "rules_json",
        "updated_by_site_account_id",
        "updated_at",
    ]),
    clan_chats: entry("clan chats", "chat-dots", ["sender_rsn", "text", "event_received_at"], ASSET_CLAN_CHAT),
    clan_member_history: entry("clan history", "clock-history", ["rsn", "rank", "last_seen"]),
    clan_snapshots: entry("clan snapshots", "camera", ["member_count", "online_count", "observed_at"]),
    clan_titles_current: entry("clan titles", "award", ["title_name", "rank_position", "observed_at"]),
    clan_titles_history: entry("title changes", "clock-history", [
        "new_title_name",
        "rank_position",
        "event_received_at",
    ]),

    clan_audit_log: entry("audit log", "clock-history", ["action", "target_name", "ts"]),
    clan_audit_settings: entry("audit settings", "gear", ["key", "value", "updated_at"]),

    localStorage: entry("localStorage", "hdd-fill", ["key", "type"]),
    sessionStorage: entry("sessionStorage", "hdd-stack", ["key", "type"]),

    clan_accounts: entry(
        "clan accounts",
        "person-fill-gear",
        ["latest_rsn", "account_type", "last_seen"],
        ASSET_PLAYER_TYPE,
    ),
    plugin_combat_achievement_catalog: entry("CA catalog", "list-stars", ["task_name", "tier", "updated_at"], ASSET_CA),
    plugin_combat_achievements: entry("combat achievements", "award", ["task_name", "tier", "updated_at"], ASSET_CA),
    plugin_combat_achievements_changes: entry(
        "CA changes",
        "award",
        ["task_name", "points_after", "event_received_at"],
        ASSET_CA,
    ),
    plugin_connection_status: entry("connection", "wifi", ["session_id", "ws_connected", "updated_at"]),
    plugin_current_state: entry("current state", "activity", ["latest_rsn", "activity", "updated_at"]),
    plugin_damage_buckets: entry("damage", "lightning-charge", ["target_name", "dealt_total", "timestamp"]),
    plugin_deaths: entry("deaths", "exclamation-octagon", ["cause_name", "region_name", "event_received_at"]),
    plugin_identity_drifts: entry("identity drifts", "shuffle", ["old_rsn", "new_rsn", "event_received_at"]),
    plugin_items_catalog: entry("items catalog", "box", ["item_name", "price_gp", "last_seen_at"]),
    plugin_login_state_transitions: entry("login transitions", "box-arrow-in-right", [
        "state_after",
        "state_before",
        "event_received_at",
    ]),
    plugin_loot_drops: entry("loot drops", "gem", ["item_name", "cause_name", "event_received_at"], ASSET_LOOT),
    plugin_npc_kc: entry("NPC KC", "bullseye", ["source_name", "kc", "updated_at"], ASSET_NPC),
    plugin_pet_drops: entry("pet drops", "heart-fill", ["pet_item_name", "trigger", "event_received_at"], ASSET_PET),
    plugin_sessions: entry("plugin sessions", "play-circle", ["rsn", "world", "connected_at"]),
    plugin_world_hops: entry("world hops", "arrow-right-circle", ["from_world", "to_world", "event_received_at"]),

    plugin_bank: entry("bank", "bank", ["item_name", "qty", "updated_at"], ASSET_VAULT),
    plugin_bank_changes: entry("bank changes", "bank", ["item_name", "qty_signed", "event_received_at"], ASSET_VAULT),
    plugin_inventory: entry("inventory", "box2", ["item_name", "qty", "updated_at"], ASSET_INVENTORY),
    plugin_inventory_changes: entry(
        "inventory changes",
        "box2",
        ["item_name", "qty_signed", "event_received_at"],
        ASSET_INVENTORY,
    ),
    plugin_equipment: entry("equipment", "shield-fill", ["item_name", "slot", "updated_at"], ASSET_EQUIPMENT),
    plugin_equipment_changes: entry(
        "equipment changes",
        "shield-fill",
        ["item_name", "qty_signed", "event_received_at"],
        ASSET_EQUIPMENT,
    ),
    plugin_seed_vault: entry("seed vault", "flower3", ["item_name", "qty", "updated_at"], ASSET_FARMING),
    plugin_seed_vault_changes: entry(
        "seed vault changes",
        "flower3",
        ["item_name", "qty_signed", "event_received_at"],
        ASSET_FARMING,
    ),
    plugin_collection_log: entry("collection log", "book", ["item_name", "category", "updated_at"]),
    plugin_collection_log_changes: entry("collection log changes", "journal-text", [
        "item_name",
        "category",
        "event_received_at",
    ]),

    plugin_stats: entry("stats", "bar-chart", ["skill", "level", "updated_at"], ASSET_STATS),
    plugin_stats_changes: entry(
        "stats changes",
        "bar-chart",
        ["skill", "level_after", "event_received_at"],
        ASSET_STATS,
    ),
    plugin_prayers: entry("prayers", "star", ["prayer_name", "active", "updated_at"], ASSET_PRAYER),
    plugin_prayers_changes: entry(
        "prayer changes",
        "star",
        ["prayer_name", "qty_signed", "event_received_at"],
        ASSET_PRAYER,
    ),
    plugin_boosts: entry("boosts", "lightning", ["skill", "diff", "updated_at"]),
    plugin_boosts_changes: entry("boost changes", "lightning", ["skill", "diff_after", "event_received_at"]),

    plugin_quests: entry("quests", "patch-question", ["quest_name", "state", "updated_at"], ASSET_QUEST),
    plugin_quests_changes: entry(
        "quest changes",
        "patch-check",
        ["quest_name", "state_after", "event_received_at"],
        ASSET_QUEST,
    ),
    plugin_diaries: entry("diaries", "journal-bookmark", ["diary_name", "tier", "updated_at"], ASSET_DIARY),
    plugin_diaries_changes: entry(
        "diary changes",
        "journal-check",
        ["diary_name", "tier_after", "event_received_at"],
        ASSET_DIARY,
    ),
    plugin_clues: entry("clues", "trophy", ["tier", "count", "updated_at"]),
    plugin_clues_changes: entry("clue changes", "trophy", ["tier", "count_after", "event_received_at"]),

    plugin_status_effects: entry("status effects", "lightning", ["effect", "active", "updated_at"]),
    plugin_status_effects_changes: entry("status effect changes", "lightning", [
        "effect",
        "qty_signed",
        "event_received_at",
    ]),
    plugin_deaths_lost_items: entry("deaths lost items", "gem", ["item_name", "qty"]),

    plugin_farming: entry("farming", "flower3", ["patch_region_name", "crop_name", "updated_at"], ASSET_FARMING),
    plugin_farming_changes: entry(
        "farming changes",
        "flower3",
        ["patch_region_name", "state_after", "event_received_at"],
        ASSET_FARMING,
    ),
    plugin_slayer: entry("slayer", "crosshair", ["target_name", "count", "updated_at"], ASSET_SLAYER),
    plugin_slayer_changes: entry(
        "slayer changes",
        "crosshair",
        ["target_name", "count_remaining_after", "event_received_at"],
        ASSET_SLAYER,
    ),
};

const TABLE_PREFIXES = ["clansocket_", "plugin_", "varez_", "discord_", "clan_"];

function stripPrefix(table: string): string {
    for (const p of TABLE_PREFIXES) {
        if (table.startsWith(p)) return table.slice(p.length);
    }
    return table;
}

export function tableMeta(table: string): TableMeta {
    const hit = TABLE_META[table];
    if (hit) return hit;
    const label = stripPrefix(table).split("_").join(" ");
    return { label, icon: "table" };
}
