import { getClanPluginDb } from "../../../core/database.js";
import { lookupRsnForHash } from "../../plugin-rsn-lookup.js";
import { rowDedupHash } from "../../projection/envelope.js";
import { clearActivePrayers } from "../../projection/prayers.js";

// mirrors IN_WORLD_LOGIN_STATES in plugin-api/session/login-states.ts; duplicated here
// because the db layer cannot import upward from plugin-api. keep in sync.
const IN_WORLD_LOGIN_STATES_DB: ReadonlySet<string> = new Set(["LOGGED_IN", "LOADING", "HOPPING", "CONNECTION_LOST"]);

export function recordPluginDisconnect(clanId: string, mode: string, sessionId: string): void {
    getClanPluginDb(clanId, mode)
        .prepare(
            "UPDATE plugin_sessions SET disconnected_at = $now WHERE session_id = $sessionId AND disconnected_at IS NULL",
        )
        .run({ now: Date.now(), sessionId });
}

interface SessionMeta {
    plugin_version: string;
}

function lookupSessionMeta(conn: ReturnType<typeof getClanPluginDb>, sessionId: string): SessionMeta {
    const row = conn.prepare("SELECT plugin_version FROM plugin_sessions WHERE session_id = ?").get(sessionId) as
        | SessionMeta
        | undefined;
    return { plugin_version: row?.plugin_version ?? "unknown" };
}

export function recordPluginLoginState(
    clanId: string,
    mode: string,
    sessionId: string,
    accountHash: string,
    stateBefore: string,
    loginState: string,
): void {
    const conn = getClanPluginDb(clanId, mode);
    const now = Date.now();
    const rsn = lookupRsnForHash(clanId, accountHash);
    const meta = lookupSessionMeta(conn, sessionId);
    conn.transaction(() => {
        if (stateBefore !== loginState) {
            const dedup = rowDedupHash(accountHash, "login_state_transition", stateBefore, loginState, now);
            conn.prepare(
                `INSERT INTO plugin_login_state_transitions
                    (account_hash, rsn, session_id, session_seq, event_received_at,
                     plugin_version, state_before, state_after,
                     world, x, y, plane, region_id, region_name, area, dedup_hash)
                 VALUES ($accountHash, $rsn, $sessionId, 0, $now, $pluginVersion, $stateBefore, $loginState,
                         NULL, NULL, NULL, NULL, NULL, NULL, NULL, $dedup)
                 ON CONFLICT(dedup_hash) DO NOTHING`,
            ).run({
                accountHash,
                rsn: rsn ?? "",
                sessionId,
                now,
                pluginVersion: meta.plugin_version,
                stateBefore,
                loginState,
                dedup,
            });
        }
        if (!IN_WORLD_LOGIN_STATES_DB.has(loginState)) {
            clearActivePrayers(conn, accountHash, now);
        }
        if (loginState === "LOGGED_IN") {
            conn.prepare(
                `INSERT INTO plugin_current_state (account_hash, latest_rsn, login_state, last_seen_in_game, first_seen, last_seen, updated_at)
                 VALUES ($accountHash, $rsn, $loginState, $now, $now, $now, $now)
                 ON CONFLICT(account_hash) DO UPDATE SET
                    login_state = excluded.login_state,
                    last_seen_in_game = excluded.last_seen_in_game,
                    last_seen = excluded.last_seen,
                    updated_at = excluded.updated_at`,
            ).run({ accountHash, rsn: rsn ?? "", loginState, now });
        } else {
            conn.prepare(
                `INSERT INTO plugin_current_state (account_hash, latest_rsn, login_state, first_seen, last_seen, updated_at)
                 VALUES ($accountHash, $rsn, $loginState, $now, $now, $now)
                 ON CONFLICT(account_hash) DO UPDATE SET
                    login_state = excluded.login_state,
                    last_seen = excluded.last_seen,
                    updated_at = excluded.updated_at`,
            ).run({ accountHash, rsn: rsn ?? "", loginState, now });
        }
    })();
}

export function touchPluginCurrentState(clanId: string, mode: string, accountHash: string, inWorld: boolean): void {
    const now = Date.now();
    const conn = getClanPluginDb(clanId, mode);
    if (inWorld) {
        conn.prepare(
            "UPDATE plugin_current_state SET last_seen_in_game = $now, last_seen = $now, updated_at = $now WHERE account_hash = $accountHash",
        ).run({ now, accountHash });
    } else {
        conn.prepare("UPDATE plugin_current_state SET last_seen = ? WHERE account_hash = ?").run(now, accountHash);
    }
}
