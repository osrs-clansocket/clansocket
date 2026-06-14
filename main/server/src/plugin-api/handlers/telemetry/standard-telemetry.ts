import { routePluginEvent } from "../../../database/index.js";
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
} from "../../event-types.js";
import { logPluginEvent } from "../../logger/index.js";
import { checkTelemetryGate, handleTelemetryReject } from "../../session/telemetry-gate.js";
import type { PluginClientMessage } from "../../types/index.js";
import type { BatchContext, DispatchContext } from "../dispatch.js";

export const STANDARD_TELEMETRY_EVENTS: readonly string[] = [
    EVENT_XP_GAINED,
    EVENT_LEVEL_UP,
    EVENT_DEATH,
    EVENT_LOCATION,
    EVENT_VITALS,
    EVENT_PRAYERS,
    EVENT_STATUS_EFFECT,
    EVENT_INTERACTING,
    EVENT_CONTAINER,
    EVENT_CONTAINER_DELTA,
    EVENT_WORLD_HOP,
    EVENT_MENU_ACTION,
    EVENT_STATS,
    EVENT_BANK_OPEN,
    EVENT_BANK_CLOSE,
    EVENT_DAMAGE_DEALT,
    EVENT_DAMAGE_TAKEN,
    EVENT_LOOT,
    EVENT_PET_DROP,
    EVENT_BOOSTS,
    EVENT_SLAYER,
    EVENT_RUNE_POUCH,
    EVENT_QUESTS,
    EVENT_QUEST_COMPLETED,
    EVENT_DIARIES,
    EVENT_DIARY_COMPLETED,
    EVENT_CLUE_COMPLETED,
    EVENT_CLUE_OPENED,
    EVENT_COLLECTION_LOG_ENTRY,
    EVENT_COLLECTION_LOG_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENT_COMPLETED,
    EVENT_FARMING_PATCH,
];

const HASHED_SNAPSHOT_TYPES: ReadonlySet<string> = new Set([
    EVENT_BANK_CLOSE,
    EVENT_BANK_OPEN,
    EVENT_BOOSTS,
    EVENT_COLLECTION_LOG_SNAPSHOT,
    EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT,
    EVENT_CONTAINER,
    EVENT_DIARIES,
    EVENT_PRAYERS,
    EVENT_QUESTS,
    EVENT_RUNE_POUCH,
    EVENT_SLAYER,
    EVENT_STATS,
]);

export function handleStandardTelemetry(ctx: DispatchContext, msg: PluginClientMessage, batchCtx?: BatchContext): void {
    const { ws, state, sessionId } = ctx;
    const gate = checkTelemetryGate(state, Date.now());
    if (!gate.ok) {
        handleTelemetryReject(ws, state, gate.reason);
        return;
    }
    if (HASHED_SNAPSHOT_TYPES.has(msg.type)) {
        const incoming = (msg as { hash?: unknown }).hash;
        if (typeof incoming === "string" && incoming.length > 0) {
            const dedupKey = `${msg.type}:${(msg as { containerId?: string }).containerId ?? ""}`;
            if (state.snapshotHashes.get(dedupKey) === incoming) return;
            state.snapshotHashes.set(dedupKey, incoming);
        }
    }
    if (msg.type === EVENT_WORLD_HOP) {
        state.currentWorld = (msg as { toWorld: number }).toWorld;
    }
    const effective: BatchContext = batchCtx ?? {
        batchSeq: state.lastBatchSeq,
        batchTick: typeof (msg as { tick?: unknown }).tick === "number" ? (msg as { tick: number }).tick : null,
    };
    routePluginEvent(state.sockClanId!, state.sockMode!, sessionId, state.sessionAccount!, msg.type, msg, effective);
    logPluginEvent(sessionId, msg.type, msg);
}
