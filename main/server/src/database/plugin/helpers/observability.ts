import { getClanPluginDb, listClanPluginModes } from "../../core/database.js";
import { getClanById } from "../../clans/clan-app-helpers.js";
import { lookupRsnForHash } from "../plugin-rsn-lookup.js";
import { clearActivePrayers } from "../projection/prayers.js";

export function markPluginConnected(clanId: string, mode: string, accountHash: string, sessionId: string): void {
    const now = Date.now();
    const conn = getClanPluginDb(clanId, mode);
    const rsn = lookupRsnForHash(conn, accountHash);
    conn.prepare(
        `INSERT INTO plugin_connection_status (account_hash, rsn, session_id, ws_connected, connected_at, disconnected_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_hash) DO UPDATE SET
           rsn = COALESCE(excluded.rsn, rsn),
           session_id = excluded.session_id,
           ws_connected = 1,
           connected_at = excluded.connected_at,
           disconnected_at = NULL,
           updated_at = excluded.updated_at`,
    ).run(accountHash, rsn, sessionId, 1, now, null, now);
}

export function markPluginDisconnected(clanId: string, mode: string, accountHash: string): void {
    const now = Date.now();
    const db = getClanPluginDb(clanId, mode);
    db.prepare(
        `UPDATE plugin_connection_status
         SET ws_connected = 0, disconnected_at = ?, latency_ms = NULL, updated_at = ?
         WHERE account_hash = ?`,
    ).run(now, now, accountHash);
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
             SET latency_ms = ?, last_ping_at = ?, last_pong_at = ?, updated_at = ?
             WHERE account_hash = ?`,
        )
        .run(pongAt - pingAt, pingAt, pongAt, pongAt, accountHash);
}

export interface PluginMetrics {
    totalSessions: number;
    uniqueAccounts: number;
    rsnChanges: number;
}

export function getPluginMetrics(clanId: string, mode: string): PluginMetrics {
    const conn = getClanPluginDb(clanId, mode);
    const totalSessions = (conn.prepare("SELECT COUNT(*) AS c FROM plugin_sessions").get() as { c: number }).c;
    const uniqueAccounts = (conn.prepare("SELECT COUNT(*) AS c FROM plugin_accounts").get() as { c: number }).c;
    const rsnChanges = (conn.prepare("SELECT COUNT(*) AS c FROM plugin_identity_drifts").get() as { c: number }).c;
    return { totalSessions, uniqueAccounts, rsnChanges };
}

export function getClanPluginMetrics(clanId: string): PluginMetrics {
    const agg: PluginMetrics = { totalSessions: 0, uniqueAccounts: 0, rsnChanges: 0 };
    if (!getClanById(clanId)) return agg;
    for (const mode of listClanPluginModes(clanId)) {
        const m = getPluginMetrics(clanId, mode);
        agg.totalSessions += m.totalSessions;
        agg.uniqueAccounts += m.uniqueAccounts;
        agg.rsnChanges += m.rsnChanges;
    }
    return agg;
}
