import logger from "@clansocket/logger";
import { DB_NAMES, getClanPluginDb, getDb, listClanPluginModes } from "../../database/index.js";

export function runPluginBootCleanup(): void {
    const appDb = getDb(DB_NAMES.APP);
    const clans = appDb.prepare("SELECT id, slug FROM clansocket_clans WHERE archived_at IS NULL").all() as {
        id: string;
        slug: string;
    }[];
    if (clans.length === 0) return;
    const now = Date.now();
    for (const clan of clans) {
        const modes = listClanPluginModes(clan.id);
        for (const mode of modes) {
            const db = getClanPluginDb(clan.id, mode);
            const sessionsClosed = db
                .prepare("UPDATE plugin_sessions SET disconnected_at = ? WHERE disconnected_at IS NULL")
                .run(now);
            const connectionsClosed = db
                .prepare(
                    `UPDATE plugin_connection_status
                     SET ws_connected = 0, disconnected_at = $now, latency_ms = NULL, updated_at = $now
                     WHERE ws_connected = 1`,
                )
                .run({ now });
            const statesCleared = db
                .prepare(
                    `UPDATE plugin_current_state
                     SET login_state = 'UNKNOWN', updated_at = ?
                     WHERE login_state IN ('LOGGED_IN', 'LOADING', 'HOPPING', 'CONNECTION_LOST')
                        OR (login_state IS NULL AND last_seen_in_game IS NOT NULL)`,
                )
                .run(now);
            const prayersCleared = db
                .prepare("UPDATE plugin_prayers SET active = 0, updated_at = ? WHERE active = 1")
                .run(now);
            if (
                sessionsClosed.changes > 0 ||
                connectionsClosed.changes > 0 ||
                statesCleared.changes > 0 ||
                prayersCleared.changes > 0
            ) {
                logger.info(
                    `[varez/boot-cleanup] clan=${clan.slug} mode=${mode} closed ${sessionsClosed.changes} sessions, ${connectionsClosed.changes} connections, cleared ${statesCleared.changes} login states, cleared ${prayersCleared.changes} active prayers from prior run`,
                );
            }
        }
    }
}
