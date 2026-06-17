const SAMPLE_PAYLOADS: Record<string, object> = {
    level_up: { skill: "Mining", level: 92 },
    death: { x: 3210, y: 3424, plane: 0, regionName: "Karamja", causeName: "Lava dragon" },
    slayer: { count: 0, countOriginal: 120, targetName: "Dragon", masterName: "Duradel" },
    loot: {
        source: "Vorkath",
        sourceLevel: 732,
        kc: 184,
        gp: 1420000,
        items: [
            { name: "Vorkath's head", qty: 1 },
            { name: "Dragon bones", qty: 1 },
        ],
    },
    pet_drop: { petName: "Vorki", trigger: "Vorkath", petItemId: 21992 },
    bank_close: {
        durationMs: 60000,
        items: [
            { name: "Dragon bones", delta: 100 },
            { name: "Lobster", delta: -42 },
        ],
    },
    quests: { completed: 146, total: 159 },
    quest_completed: { name: "Dragon Slayer II" },
    diaries: { completed: 32, total: 48 },
    diary_completed: { region: "karamja", tier: "elite" },
    clue_completed: { tier: "Elite", total: 184 },
    collection_log_entry: { itemName: "Dragon claws", itemId: 13652 },
    collection_log_snapshot: { itemCount: 742 },
    combat_achievement_completed: { name: "Verdant Vanquisher", tier: "Grandmaster", points: 6 },
    combat_achievements_snapshot: { totalCompleted: 412 },
    menu_action: { action: "Attack", option: "Level-92", target: "Dragon" },
    farming_patch: { regionId: 1234, varbitId: 4771, value: 57 },
    clan_chat: { rank: "Captain", message: "wts dragon bones 5k ea" },
};

export function getSamplePayload(triggerType: string): object {
    return SAMPLE_PAYLOADS[triggerType] ?? {};
}

export const SAMPLE_RSN = "Varietyz";
