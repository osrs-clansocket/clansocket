export type QuestsMsg = { type: "quests"; hash: string; quests: { id: number; name: string; state: string }[] };
export type QuestCompletedMsg = {
    type: "quest_completed";
    id: number;
    name: string;
    questsCompletedBefore?: number | null;
};

export type DiariesMsg = {
    type: "diaries";
    hash: string;
    diaries: { region: string; tier: string; complete: boolean }[];
};
export type DiaryCompletedMsg = {
    type: "diary_completed";
    region: string;
    tier: string;
    diariesCompletedBefore?: number | null;
};

export type ClueCompletedMsg = {
    type: "clue_completed";
    tier: string;
    total: number;
    cluesCompletedBefore?: number | null;
};
export type ClueOpenedMsg = { type: "clue_opened"; tier: string; itemId: number; itemName?: string | null };

export type CollectionLogEntryMsg = { type: "collection_log_entry"; itemName: string; itemId?: number | null };
export type CollectionLogSnapshotMsg = {
    type: "collection_log_snapshot";
    hash: string;
    itemCount: number;
    items: { itemId: number; quantity: number; name?: string | null; price?: number | null }[];
};

export type FarmingPatchMsg = {
    type: "farming_patch";
    varbitId: number;
    value: number;
    where: {
        world?: number | null;
        x?: number | null;
        y?: number | null;
        plane?: number | null;
        regionId?: number | null;
        regionName?: string | null;
        area?: string | null;
    };
};

export type CombatAchievementCompletedMsg = {
    type: "combat_achievement_completed";
    taskId: number;
    name: string;
    tier: string;
    taskType: string;
    points: number;
    bossId: number;
    bossName: string;
    pointsBefore: number;
};

export type CombatAchievementsSnapshotMsg = {
    type: "combat_achievements_snapshot";
    hash: string;
    tierCounts: Record<string, number>;
    totalCompleted: number;
    completedTasks: { taskId: number; name?: string | null }[];
};

export type CombatAchievementsCatalogMsg = {
    type: "combat_achievements_catalog";
    hash: string;
    tasks: {
        taskId: number;
        name: string;
        description: string;
        tier: string;
        taskType: string;
        points: number;
        bossId: number;
        bossName: string;
    }[];
};

export type CompletionsClientMessage =
    | QuestsMsg
    | QuestCompletedMsg
    | DiariesMsg
    | DiaryCompletedMsg
    | ClueCompletedMsg
    | ClueOpenedMsg
    | CollectionLogEntryMsg
    | CollectionLogSnapshotMsg
    | FarmingPatchMsg
    | CombatAchievementCompletedMsg
    | CombatAchievementsSnapshotMsg
    | CombatAchievementsCatalogMsg;
