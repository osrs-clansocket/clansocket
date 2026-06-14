import { recordPluginClanTitlesSnapshot } from "../../../database/index.js";
import { EVENT_CLAN_TITLES_SNAPSHOT } from "../../event-types.js";
import { logPluginError, logPluginEvent } from "../../logger/index.js";
import { isTelemetryAllowedStatus, rejectUnauthed } from "../../session/telemetry-gate.js";
import type { PluginClientMessage } from "../../types/index.js";
import type { DispatchContext } from "../dispatch.js";

type ClanTitlesMsg = Extract<PluginClientMessage, { type: "clan_titles_snapshot" }>;

export function handleClanTitlesSnapshot(ctx: DispatchContext, msg: ClanTitlesMsg): void {
    const { ws, state, sessionId } = ctx;
    if (!state.authed || !state.sockClanId || !state.sessionAccount || !state.sessionRsn) {
        rejectUnauthed(ws, state);
        return;
    }
    if (!isTelemetryAllowedStatus(state.clanStatus)) return;
    const dedupKey = `clan_titles_snapshot:`;
    if (state.snapshotHashes.get(dedupKey) === msg.fingerprint) return;
    state.snapshotHashes.set(dedupKey, msg.fingerprint);
    try {
        const changes = recordPluginClanTitlesSnapshot(state.sockClanId, {
            clanId: state.sockClanId,
            clanName: msg.clanName,
            accountHash: state.sessionAccount,
            rsn: state.sessionRsn,
            titles: msg.titles,
            observedAt: Date.now(),
            sessionId,
        });
        logPluginEvent(sessionId, EVENT_CLAN_TITLES_SNAPSHOT, {
            clanName: msg.clanName,
            titles: msg.titles.length,
            changes,
            fingerprint: msg.fingerprint,
        });
    } catch (err) {
        logPluginError(sessionId, `clan_titles_snapshot record failed: ${(err as Error).message}`);
    }
}
