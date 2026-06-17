import { getClanDb, getClanPluginDb, listClanPluginModes } from "../../core/database.js";
import { getClanById } from "../../clans/clan-app-helpers.js";
import { lookupRsnForHash } from "../plugin-rsn-lookup.js";
import { clearActivePrayers } from "../projection/prayers.js";

export function markPluginConnected(clanId: string, mode: string, accountHash: string, sessionId: string): void {
    const now = Date.now();
    const conn = getClanPluginDb(clanId, mode);
    const rsn = lookupRsnForHash(clanId, accountHash);
    conn.prepare(
        `INSERT INTO plugin_connection_status (account_hash, rsn, session_id, ws_connected, connected_at, disconnected_at, updated_at)
         VALUES ($accountHash, $rsn, $sessionId, 1, $now, NULL, $now)
         ON CONFLICT(account_hash) DO UPDATE SET
           rsn = COALESCE(excluded.rsn, rsn),
           session_id = excluded.session_id,
           ws_connected = 1,
           connected_at = excluded.connected_at,
           disconnected_at = NULL,
           updated_at = excluded.updated_at`,
    ).run({ accountHash, rsn, sessionId, now });
}

export function markPluginDisconnected(clanId: string, mode: string, accountHash: string): void {
    const now = Date.now();
    const db = getClanPluginDb(clanId, mode);
    db.prepare(
        `UPDATE plugin_connection_status
         SET ws_connected = 0, disconnected_at = $now, latency_ms = NULL, updated_at = $now
         WHERE account_hash = $accountHash`,
    ).run({ now, accountHash });
    db.prepare("UPDATE plugin_current_state SET login_state = 'UNKNOWN', updated_at = ? WHERE account_hash = ?").run(
        now,
        accountHash,
    );
    clearActivePrayers(db, accountHash, now);
}

export function recordPluginPingPong(
    clanId: string,
    mode: string,
    accountHash: string,
    pingAt: number,
    pongAt: number,
): void {
    getClanPluginDb(clanId, mode)
        .prepare(
            `UPDATE plugin_connection_status
             SET latency_ms = $latency, last_ping_at = $pingAt, last_pong_at = $pongAt, updated_at = $pongAt
             WHERE account_hash = $accountHash`,
        )
        .run({ latency: pongAt - pingAt, pingAt, pongAt, accountHash });
}

export interface PluginMetrics {
    totalSessions: number;
    uniqueAccounts: number;
    rsnChanges: number;
}

function readUniqueAccountsForClan(clanId: string): number {
    const row = getClanDb(clanId).prepare("SELECT COUNT(*) AS c FROM clan_accounts").get() as { c: number };
    return row.c;
}

export function getPluginMetrics(clanId: string, mode: string): PluginMetrics {
    const conn = getClanPluginDb(clanId, mode);
    const totalSessions = (conn.prepare("SELECT COUNT(*) AS c FROM plugin_sessions").get() as { c: number }).c;
    const rsnChanges = (conn.prepare("SELECT COUNT(*) AS c FROM plugin_identity_drifts").get() as { c: number }).c;
    return { totalSessions, uniqueAccounts: 0, rsnChanges };
}

export function getClanPluginMetrics(clanId: string): PluginMetrics {
    const agg: PluginMetrics = { totalSessions: 0, uniqueAccounts: 0, rsnChanges: 0 };
    if (!getClanById(clanId)) return agg;
    for (const mode of listClanPluginModes(clanId)) {
        const m = getPluginMetrics(clanId, mode);
        agg.totalSessions += m.totalSessions;
        agg.rsnChanges += m.rsnChanges;
    }
    agg.uniqueAccounts = readUniqueAccountsForClan(clanId);
    return agg;
}
