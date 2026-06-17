import { getClanDb, getClanPluginDb, listClanPluginModes } from "../../core/database-clans.js";

type Resolver = (clanId: string) => readonly string[];

interface RegistryEntry {
    triggerType: string;
    field: string;
    resolver: Resolver;
}

function distinctFromPluginTable(table: string, column: string): Resolver {
    const sql = `SELECT DISTINCT "${column}" AS v FROM "${table}" WHERE "${column}" IS NOT NULL AND "${column}" != '' ORDER BY "${column}"`;
    return (clanId: string): readonly string[] => {
        const set = new Set<string>();
        for (const mode of listClanPluginModes(clanId)) {
            const db = getClanPluginDb(clanId, mode);
            const rows = db.prepare(sql).all() as { v: unknown }[];
            for (const r of rows) set.add(String(r.v));
        }
        return [...set].sort((a, b) => a.localeCompare(b));
    };
}

function distinctFromClanTable(table: string, column: string): Resolver {
    const sql = `SELECT DISTINCT "${column}" AS v FROM "${table}" WHERE "${column}" IS NOT NULL AND "${column}" != '' ORDER BY "${column}"`;
    return (clanId: string): readonly string[] => {
        const db = getClanDb(clanId);
        const rows = db.prepare(sql).all() as { v: unknown }[];
        return rows.map((r) => String(r.v));
    };
}

const REGISTRY: readonly RegistryEntry[] = [
    { triggerType: "*", field: "rsn", resolver: distinctFromClanTable("clan_members", "member_name") },
    { triggerType: "*", field: "accountType", resolver: distinctFromClanTable("clan_accounts", "account_type") },
    { triggerType: "level_up", field: "skill", resolver: distinctFromPluginTable("plugin_stats", "skill") },
    { triggerType: "level_up", field: "level", resolver: distinctFromPluginTable("plugin_stats", "level") },
    { triggerType: "death", field: "causeName", resolver: distinctFromPluginTable("plugin_deaths", "cause_name") },
    { triggerType: "death", field: "regionName", resolver: distinctFromPluginTable("plugin_deaths", "region_name") },
    { triggerType: "death", field: "area", resolver: distinctFromPluginTable("plugin_deaths", "area") },
    {
        triggerType: "death",
        field: "causeCategory",
        resolver: distinctFromPluginTable("plugin_deaths", "cause_category"),
    },
    { triggerType: "death", field: "causeKind", resolver: distinctFromPluginTable("plugin_deaths", "cause_kind") },
    { triggerType: "slayer", field: "targetName", resolver: distinctFromPluginTable("plugin_slayer", "target_name") },
    { triggerType: "slayer", field: "masterName", resolver: distinctFromPluginTable("plugin_slayer", "master_name") },
    { triggerType: "slayer", field: "bossName", resolver: distinctFromPluginTable("plugin_slayer", "boss_name") },
    { triggerType: "slayer", field: "areaName", resolver: distinctFromPluginTable("plugin_slayer", "area_name") },
    { triggerType: "loot", field: "source", resolver: distinctFromPluginTable("plugin_loot_drops", "cause_name") },
    { triggerType: "loot", field: "items", resolver: distinctFromPluginTable("plugin_loot_drops", "item_name") },
    { triggerType: "loot", field: "regionName", resolver: distinctFromPluginTable("plugin_loot_drops", "region_name") },
    { triggerType: "loot", field: "causeKind", resolver: distinctFromPluginTable("plugin_loot_drops", "cause_kind") },
    {
        triggerType: "pet_drop",
        field: "petName",
        resolver: distinctFromPluginTable("plugin_pet_drops", "pet_item_name"),
    },
    { triggerType: "pet_drop", field: "trigger", resolver: distinctFromPluginTable("plugin_pet_drops", "trigger") },
    { triggerType: "pet_drop", field: "source", resolver: distinctFromPluginTable("plugin_pet_drops", "source_name") },
    {
        triggerType: "pet_drop",
        field: "regionName",
        resolver: distinctFromPluginTable("plugin_pet_drops", "region_name"),
    },
    {
        triggerType: "pet_drop",
        field: "sourceKind",
        resolver: distinctFromPluginTable("plugin_pet_drops", "source_kind"),
    },
    { triggerType: "quest_completed", field: "name", resolver: distinctFromPluginTable("plugin_quests", "quest_name") },
    { triggerType: "quest_completed", field: "status", resolver: distinctFromPluginTable("plugin_quests", "state") },
    {
        triggerType: "diary_completed",
        field: "region",
        resolver: distinctFromPluginTable("plugin_diaries", "diary_region"),
    },
    {
        triggerType: "diary_completed",
        field: "name",
        resolver: distinctFromPluginTable("plugin_diaries", "diary_name"),
    },
    { triggerType: "diary_completed", field: "tier", resolver: distinctFromPluginTable("plugin_diaries", "tier") },
    { triggerType: "clue_completed", field: "tier", resolver: distinctFromPluginTable("plugin_clues", "tier") },
    {
        triggerType: "collection_log_entry",
        field: "itemName",
        resolver: distinctFromPluginTable("plugin_collection_log", "item_name"),
    },
    {
        triggerType: "collection_log_entry",
        field: "category",
        resolver: distinctFromPluginTable("plugin_collection_log", "category"),
    },
    {
        triggerType: "combat_achievement_completed",
        field: "name",
        resolver: distinctFromPluginTable("plugin_combat_achievement_catalog", "task_name"),
    },
    {
        triggerType: "combat_achievement_completed",
        field: "bossName",
        resolver: distinctFromPluginTable("plugin_combat_achievement_catalog", "boss_name"),
    },
    {
        triggerType: "combat_achievement_completed",
        field: "taskType",
        resolver: distinctFromPluginTable("plugin_combat_achievement_catalog", "task_type"),
    },
    {
        triggerType: "combat_achievement_completed",
        field: "tier",
        resolver: distinctFromPluginTable("plugin_combat_achievement_catalog", "tier"),
    },
    {
        triggerType: "farming_patch",
        field: "patchRegionName",
        resolver: distinctFromPluginTable("plugin_farming", "patch_region_name"),
    },
    {
        triggerType: "farming_patch",
        field: "cropName",
        resolver: distinctFromPluginTable("plugin_farming", "crop_name"),
    },
    { triggerType: "farming_patch", field: "state", resolver: distinctFromPluginTable("plugin_farming", "state") },
    { triggerType: "clan_chat", field: "rank", resolver: distinctFromClanTable("clan_members", "rank") },
    { triggerType: "clan_chat", field: "message", resolver: distinctFromClanTable("clan_chats", "text") },
];

export function getConditionValueOptions(clanId: string, triggerType: string, field: string): readonly string[] {
    for (const entry of REGISTRY) {
        if ((entry.triggerType === "*" || entry.triggerType === triggerType) && entry.field === field) {
            return entry.resolver(clanId);
        }
    }
    return [];
}
