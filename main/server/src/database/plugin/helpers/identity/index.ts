import { getClanDb, getClanPluginDb } from "../../../core/database.js";
import { upsertRsnHistory } from "../../../site/rsn/rsn-history.js";
import { maybeWriteClanSnapshot, upsertClanAccount, upsertClanMemberHistory } from "./clan-db-writes.js";
import { recordDrift, upsertCurrentState, upsertSession } from "./plugin-db-writes.js";
import type { PluginIdentityRecord } from "./types.js";

export type { PluginIdentityRecord } from "./types.js";
export { recordPluginDisconnect, recordPluginLoginState, touchPluginCurrentState } from "./state-transitions.js";

export function recordPluginIdentity(
    clanId: string,
    mode: string,
    sessionId: string,
    identity: PluginIdentityRecord,
): void {
    const now = Date.now();
    const conn = getClanPluginDb(clanId, mode);
    const clanDb = getClanDb(clanId);
    const existing = clanDb
        .prepare("SELECT latest_rsn FROM clan_accounts WHERE account_hash = ?")
        .get(identity.accountHash) as { latest_rsn: string } | undefined;
    conn.transaction(() => {
        if (existing && existing.latest_rsn.toLowerCase() !== identity.rsn.toLowerCase()) {
            recordDrift(conn, identity, existing.latest_rsn, sessionId, now);
        }
        upsertSession(conn, sessionId, identity, now);
        upsertCurrentState(conn, sessionId, identity, now);
    })();
    clanDb.transaction(() => {
        upsertClanAccount(clanDb, identity, existing !== undefined, now);
        upsertClanMemberHistory(clanDb, clanId, identity, now);
        maybeWriteClanSnapshot(clanDb, clanId, identity, now);
    })();
    upsertRsnHistory(identity, now);
}
