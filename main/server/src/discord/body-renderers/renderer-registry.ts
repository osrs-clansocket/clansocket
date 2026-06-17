import { renderBankClose } from "./bank/bank-close-renderer.js";
import { renderClanChat } from "./chat/clan-chat-renderer.js";
import {
    renderCombatAchievementCompleted,
    renderCombatAchievementsSnapshot,
} from "./combat/combat-achievement-renderer.js";
import { renderDeath } from "./combat/death-renderer.js";
import { renderSlayer } from "./combat/slayer-renderer.js";
import { renderLoot } from "./drops/loot-renderer.js";
import { renderPetDrop } from "./drops/pet-drop-renderer.js";
import { renderClueCompleted } from "./progression/clue-renderer.js";
import { renderCollectionLogEntry, renderCollectionLogSnapshot } from "./progression/collection-log-renderer.js";
import { renderDiaries, renderDiaryCompleted } from "./progression/diary-renderer.js";
import { renderLevelUp } from "./progression/level-up-renderer.js";
import { renderQuestCompleted, renderQuests } from "./progression/quest-renderer.js";
import type { Renderer } from "./renderer-types.js";
import { renderFarmingPatch } from "./skilling/farming-patch-renderer.js";
import { renderMenuAction } from "./social/menu-action-renderer.js";

export const TRIGGER_LEVEL_UP = "level_up";
export const TRIGGER_DEATH = "death";
export const TRIGGER_SLAYER = "slayer";
export const TRIGGER_LOOT = "loot";
export const TRIGGER_PET_DROP = "pet_drop";
export const TRIGGER_BANK_CLOSE = "bank_close";
export const TRIGGER_QUESTS = "quests";
export const TRIGGER_QUEST_COMPLETED = "quest_completed";
export const TRIGGER_DIARIES = "diaries";
export const TRIGGER_DIARY_COMPLETED = "diary_completed";
export const TRIGGER_CLUE_COMPLETED = "clue_completed";
export const TRIGGER_COLLECTION_LOG_ENTRY = "collection_log_entry";
export const TRIGGER_COLLECTION_LOG_SNAPSHOT = "collection_log_snapshot";
export const TRIGGER_CA_COMPLETED = "combat_achievement_completed";
export const TRIGGER_CA_SNAPSHOT = "combat_achievements_snapshot";
export const TRIGGER_MENU_ACTION = "menu_action";
export const TRIGGER_FARMING_PATCH = "farming_patch";
export const TRIGGER_CLAN_CHAT = "clan_chat";

const RENDERERS: Record<string, Renderer> = {
    [TRIGGER_LEVEL_UP]: renderLevelUp,
    [TRIGGER_DEATH]: renderDeath,
    [TRIGGER_SLAYER]: renderSlayer,
    [TRIGGER_LOOT]: renderLoot,
    [TRIGGER_PET_DROP]: renderPetDrop,
    [TRIGGER_BANK_CLOSE]: renderBankClose,
    [TRIGGER_QUESTS]: renderQuests,
    [TRIGGER_QUEST_COMPLETED]: renderQuestCompleted,
    [TRIGGER_DIARIES]: renderDiaries,
    [TRIGGER_DIARY_COMPLETED]: renderDiaryCompleted,
    [TRIGGER_CLUE_COMPLETED]: renderClueCompleted,
    [TRIGGER_COLLECTION_LOG_ENTRY]: renderCollectionLogEntry,
    [TRIGGER_COLLECTION_LOG_SNAPSHOT]: renderCollectionLogSnapshot,
    [TRIGGER_CA_COMPLETED]: renderCombatAchievementCompleted,
    [TRIGGER_CA_SNAPSHOT]: renderCombatAchievementsSnapshot,
    [TRIGGER_MENU_ACTION]: renderMenuAction,
    [TRIGGER_FARMING_PATCH]: renderFarmingPatch,
    [TRIGGER_CLAN_CHAT]: renderClanChat,
};

export function pickRenderer(triggerType: string): Renderer | null {
    return RENDERERS[triggerType] ?? null;
}

export function listSupportedTriggers(): readonly string[] {
    return Object.keys(RENDERERS);
}
