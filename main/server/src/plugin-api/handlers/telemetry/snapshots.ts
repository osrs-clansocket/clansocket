import { upsertPluginCombatAchievementCatalog } from "../../../database/index.js";
import { EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT } from "../../event-types.js";
import { logPluginEvent } from "../../logger/index.js";
import { checkTelemetryGate, handleTelemetryReject } from "../../session/telemetry-gate.js";
import type { PluginClientMessage } from "../../types/index.js";
import type { DispatchContext } from "../dispatch.js";

const latestCatalogHashByClanMode = new Map<string, string>();

type CombatAchievementsCatalogMsg = Extract<PluginClientMessage, { type: "combat_achievements_catalog" }>;

export function handleCombatAchievementsCatalog(ctx: DispatchContext, msg: CombatAchievementsCatalogMsg): void {
    const { ws, state, sessionId } = ctx;
    const gate = checkTelemetryGate(state, Date.now());
    if (!gate.ok) {
        handleTelemetryReject(ws, state, gate.reason);
        return;
    }
    const catalogKey = `${state.sockClanId!}:${state.sockMode!}`;
    if (latestCatalogHashByClanMode.get(catalogKey) === msg.hash) return;
    const count = upsertPluginCombatAchievementCatalog(state.sockClanId!, state.sockMode!, msg.tasks);
    state.snapshotHashes.delete(`${EVENT_COMBAT_ACHIEVEMENTS_SNAPSHOT}:`);
    latestCatalogHashByClanMode.set(catalogKey, msg.hash);
    logPluginEvent(sessionId, msg.type, { tasks: count, hash: msg.hash });
}
