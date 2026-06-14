import { recordClanRoster, recordPluginClanTitlesSnapshot } from "../../../database/index.js";
import { logPluginError } from "../../logger/index.js";
import type { PluginClientMessage } from "../../types/index.js";
import type { PluginRosterSnapshotEntry, PluginSocketState } from "../../session/socket-state.js";

type ClaimConsentResponseMsg = Extract<PluginClientMessage, { type: "claim_consent_response" }>;
export type ClanProof = NonNullable<ClaimConsentResponseMsg["clanProof"]>;
export type RosterPayload = NonNullable<ClanProof["roster"]>;
export type TitlesPayload = NonNullable<ClanProof["titles"]>;
export type { ClaimConsentResponseMsg };

export function ingestRosterAtClaim(
    state: PluginSocketState,
    clanId: string,
    accountHash: string,
    roster: RosterPayload,
    sessionId: string,
): void {
    try {
        recordClanRoster(clanId, accountHash, roster.fingerprint, roster.members);
        state.lastRosterFingerprint = roster.fingerprint;
        const snapshot = new Map<string, PluginRosterSnapshotEntry>();
        for (const m of roster.members) {
            snapshot.set(m.name.toLowerCase(), { rank: m.rank, joinedAt: m.joinedAt });
        }
        state.lastRosterSnapshot = snapshot;
    } catch (err) {
        logPluginError(sessionId, `claim_consent_response roster ingest failed: ${(err as Error).message}`);
    }
}

export function ingestTitlesAtClaim(
    state: PluginSocketState,
    clanId: string,
    titles: TitlesPayload,
    sessionId: string,
): void {
    if (!state.sessionAccount || !state.sessionRsn) return;
    try {
        recordPluginClanTitlesSnapshot(clanId, {
            clanId,
            clanName: titles.clanName,
            accountHash: state.sessionAccount,
            rsn: state.sessionRsn,
            titles: titles.titles,
            observedAt: Date.now(),
            sessionId,
        });
    } catch (err) {
        logPluginError(sessionId, `claim_consent_response titles ingest failed: ${(err as Error).message}`);
    }
}
