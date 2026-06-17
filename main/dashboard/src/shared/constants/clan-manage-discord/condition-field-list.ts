export interface ConditionField {
    field: string;
    label: string;
}

const CONDITION_FIELDS_BY_TRIGGER: Record<string, readonly ConditionField[]> = {
    level_up: [
        { field: "rsn", label: "RSN" },
        { field: "accountType", label: "Type" },
        { field: "skill", label: "Skill" },
        { field: "level", label: "New level" },
    ],
    death: [
        { field: "rsn", label: "RSN" },
        { field: "causeName", label: "Cause" },
        { field: "causeCategory", label: "Cause category" },
        { field: "causeKind", label: "Cause kind" },
        { field: "regionName", label: "Region" },
        { field: "area", label: "Area" },
    ],
    slayer: [
        { field: "rsn", label: "RSN" },
        { field: "targetName", label: "Task target" },
        { field: "masterName", label: "Slayer master" },
        { field: "bossName", label: "Boss" },
        { field: "areaName", label: "Slayer area" },
        { field: "count", label: "Remaining" },
        { field: "countOriginal", label: "Original count" },
    ],
    loot: [
        { field: "rsn", label: "RSN" },
        { field: "source", label: "Source NPC/item" },
        { field: "causeKind", label: "Cause kind" },
        { field: "items", label: "Item" },
        { field: "regionName", label: "Region" },
        { field: "gp", label: "Total GP" },
        { field: "kc", label: "Kill count" },
        { field: "sourceLevel", label: "Source level" },
    ],
    pet_drop: [
        { field: "rsn", label: "RSN" },
        { field: "petName", label: "Pet name" },
        { field: "trigger", label: "Trigger source" },
        { field: "source", label: "Source NPC" },
        { field: "sourceKind", label: "Source kind" },
        { field: "regionName", label: "Region" },
    ],
    bank_close: [
        { field: "rsn", label: "RSN" },
        { field: "itemCount", label: "Item count" },
    ],
    quests: [
        { field: "rsn", label: "RSN" },
        { field: "completed", label: "Completed" },
        { field: "total", label: "Total" },
    ],
    quest_completed: [
        { field: "rsn", label: "RSN" },
        { field: "name", label: "Quest name" },
        { field: "status", label: "Status" },
    ],
    diaries: [
        { field: "rsn", label: "RSN" },
        { field: "completed", label: "Completed" },
        { field: "total", label: "Total" },
    ],
    diary_completed: [
        { field: "rsn", label: "RSN" },
        { field: "name", label: "Diary name" },
        { field: "region", label: "Region" },
        { field: "tier", label: "Tier" },
    ],
    clue_completed: [
        { field: "rsn", label: "RSN" },
        { field: "tier", label: "Tier" },
        { field: "total", label: "Total" },
    ],
    collection_log_entry: [
        { field: "rsn", label: "RSN" },
        { field: "itemName", label: "Item name" },
        { field: "category", label: "Category" },
    ],
    collection_log_snapshot: [
        { field: "rsn", label: "RSN" },
        { field: "itemCount", label: "Item count" },
    ],
    combat_achievement_completed: [
        { field: "rsn", label: "RSN" },
        { field: "name", label: "CA name" },
        { field: "bossName", label: "Boss" },
        { field: "taskType", label: "Task type" },
        { field: "tier", label: "Tier" },
        { field: "points", label: "Points" },
    ],
    combat_achievements_snapshot: [
        { field: "rsn", label: "RSN" },
        { field: "totalCompleted", label: "Total completed" },
    ],
    menu_action: [
        { field: "rsn", label: "RSN" },
        { field: "action", label: "Action" },
        { field: "option", label: "Option" },
        { field: "target", label: "Target" },
    ],
    farming_patch: [
        { field: "rsn", label: "RSN" },
        { field: "patchRegionName", label: "Patch region" },
        { field: "cropName", label: "Crop" },
        { field: "state", label: "State" },
        { field: "value", label: "Varbit value" },
    ],
    clan_chat: [
        { field: "rsn", label: "RSN" },
        { field: "accountType", label: "Type" },
        { field: "rank", label: "Rank" },
        { field: "message", label: "Message" },
    ],
};

export function getConditionFieldsForTrigger(triggerType: string): readonly ConditionField[] {
    return CONDITION_FIELDS_BY_TRIGGER[triggerType] ?? [];
}
