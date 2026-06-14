import type { Database } from "better-sqlite3";
import {
    EVENT_BANK_CLOSE,
    EVENT_BANK_OPEN,
    EVENT_BOOSTS,
    EVENT_CLUE_COMPLETED,
    EVENT_CLUE_OPENED,
    EVENT_COLLECTION_LOG_ENTRY,
    EVENT_COLLECTION_LOG_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENT_COMPLETED,
    EVENT_CONTAINER,
    EVENT_CONTAINER_DELTA,
    EVENT_DAMAGE_DEALT,
    EVENT_DAMAGE_TAKEN,
    EVENT_DEATH,
    EVENT_DIARIES,
    EVENT_DIARY_COMPLETED,
    EVENT_FARMING_PATCH,
    EVENT_INTERACTING,
    EVENT_LEVEL_UP,
    EVENT_LOCATION,
    EVENT_LOOT,
    EVENT_MENU_ACTION,
    EVENT_PET_DROP,
    EVENT_PRAYERS,
    EVENT_QUESTS,
    EVENT_QUEST_COMPLETED,
    EVENT_RUNE_POUCH,
    EVENT_SLAYER,
    EVENT_STATS,
    EVENT_STATUS_EFFECT,
    EVENT_VITALS,
    EVENT_WORLD_HOP,
    EVENT_XP_GAINED,
} from "../../../plugin-api/event-types.js";
import { handleBankClose, handleBankOpen } from "./bank.js";
import { handleBoosts } from "./boosts.js";
import { handleClueCompleted, handleClueOpened } from "./clues.js";
import { handleCollectionLogEntry, handleCollectionLogSnapshot } from "./collection-log.js";
import { handleCombatAchievement, handleCombatAchievementsSnapshot } from "./combat-achievements.js";
import { handleContainer, handleContainerDelta, handleRunePouch } from "./containers.js";
import { handleDamageDealt, handleDamageTaken } from "./combat.js";
import { handleInteracting, handleVitals } from "./current-state.js";
import { handleDeath } from "./deaths.js";
import { handleDiaries, handleDiaryCompleted } from "./diaries.js";
import type { EventEnvelopeCols } from "./envelope.js";
import { handleFarmingPatch } from "./farming.js";
import type { Payload } from "./helpers.js";
import { handleSlayer } from "./slayer.js";
import { handleLocation } from "./location.js";
import { handleLoot } from "./loot.js";
import { handleMenuAction } from "./menu-action.js";
import { handlePetDrop } from "./pet-drops.js";
import { handlePrayers } from "./prayers.js";
import { handleQuestCompleted, handleQuests } from "./quests.js";
import { handleLevelUp, handleStats, handleXpGained } from "./stats.js";
import { handleStatusEffect } from "./status-effects.js";
import { handleWorldHop } from "./world-hops.js";

export type EnvelopedRouteFn = (
    conn: Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
) => void;

export const CURRENT_STATE_ROUTES: Record<string, EnvelopedRouteFn> = {
    [EVENT_LOCATION]: handleLocation,
    [EVENT_VITALS]: handleVitals,
    [EVENT_INTERACTING]: handleInteracting,
    [EVENT_MENU_ACTION]: handleMenuAction,
    [EVENT_DAMAGE_DEALT]: handleDamageDealt,
    [EVENT_DAMAGE_TAKEN]: handleDamageTaken,
    [EVENT_BANK_OPEN]: handleBankOpen,
    [EVENT_BANK_CLOSE]: handleBankClose,
    [EVENT_CONTAINER]: handleContainer,
    [EVENT_CONTAINER_DELTA]: handleContainerDelta,
    [EVENT_RUNE_POUCH]: handleRunePouch,
    [EVENT_COLLECTION_LOG_SNAPSHOT]: handleCollectionLogSnapshot,
    [EVENT_COLLECTION_LOG_ENTRY]: handleCollectionLogEntry,
    [EVENT_STATS]: handleStats,
    [EVENT_LEVEL_UP]: handleLevelUp,
    [EVENT_XP_GAINED]: handleXpGained,
    [EVENT_PRAYERS]: handlePrayers,
    [EVENT_BOOSTS]: handleBoosts,
    [EVENT_QUESTS]: handleQuests,
    [EVENT_QUEST_COMPLETED]: handleQuestCompleted,
    [EVENT_DIARIES]: handleDiaries,
    [EVENT_DIARY_COMPLETED]: handleDiaryCompleted,
    [EVENT_CLUE_COMPLETED]: handleClueCompleted,
    [EVENT_CLUE_OPENED]: handleClueOpened,
    [EVENT_COMBAT_ACHIEVEMENT_COMPLETED]: handleCombatAchievement,
    [EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT]: handleCombatAchievementsSnapshot,
    [EVENT_DEATH]: handleDeath,
    [EVENT_LOOT]: handleLoot,
    [EVENT_PET_DROP]: handlePetDrop,
    [EVENT_WORLD_HOP]: handleWorldHop,
    [EVENT_STATUS_EFFECT]: handleStatusEffect,
    [EVENT_FARMING_PATCH]: handleFarmingPatch,
    [EVENT_SLAYER]: handleSlayer,
};
