export type PluginConfigFieldKind = "boolean" | "string";

export interface PluginConfigField {
    key: string;
    label: string;
    description: string;
    kind: PluginConfigFieldKind;
    defaultValue: string | number | boolean;
}

export const PLUGIN_CONFIG_FIELDS: readonly PluginConfigField[] = [
    {
        key: "streamSkillsSnapshot",
        label: "Skills snapshot",
        description: "Full table on login + change.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamXpGains",
        label: "XP gains",
        description: "Per-skill XP deltas.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamLevelUps",
        label: "Level-ups",
        description: "Per-skill level-up events.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamCombat",
        label: "Combat",
        description: "Hitsplats, target.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamDeath",
        label: "Death",
        description: "Player death events.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamSlayer",
        label: "Slayer",
        description: "Task name, count, master.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamVitals",
        label: "Vitals",
        description: "Run energy, weight, special.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamPrayer",
        label: "Prayer",
        description: "Active prayers.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamBoosts",
        label: "Stat boosts",
        description: "Boost differences.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamStatusEffects",
        label: "Status effects",
        description: "Poison, venom, disease, cold.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamLocation",
        label: "Location",
        description: "Real-time coords visible to clan.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamInventory",
        label: "Inventory",
        description: "Inventory, equipment, seed vault.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamBank",
        label: "Bank",
        description: "Snapshots while open. Reveals wealth.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamRunePouch",
        label: "Rune pouch",
        description: "Slot contents.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamLoot",
        label: "Loot",
        description: "NPC drops + pickups.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamPetDrops",
        label: "Pet drops",
        description: "Pet drop events.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamQuests",
        label: "Quests",
        description: "Snapshots + completions.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamDiaries",
        label: "Diaries",
        description: "Diary tasks + completions.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamClues",
        label: "Clues",
        description: "Opens + per-tier completions.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamCollectionLog",
        label: "Collection log",
        description: "Per-item + full snapshot on log open.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamCombatAchievements",
        label: "Combat achievements",
        description: "Catalog, snapshot, completions.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "sendClanChat",
        label: "Clan chat",
        description: "Configured clan only. Server dedups.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamMenuActions",
        label: "Menu actions",
        description: "Right-click options on objects/NPCs.",
        kind: "boolean",
        defaultValue: true,
    },
    {
        key: "streamFarming",
        label: "Farming patches",
        description: "Patch state changes.",
        kind: "boolean",
        defaultValue: true,
    },
];
