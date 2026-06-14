import type Database from "better-sqlite3";
import logger from "@clansocket/logger";
import { recordIdentityDrift } from "../../projection/identity-drifts.js";
import type { PluginIdentityRecord } from "./types.js";

export function recordDrift(
    conn: Database.Database,
    identity: PluginIdentityRecord,
    existingRsn: string,
    sessionId: string,
    now: number,
): void {
    const session = conn
        .prepare("SELECT plugin_version, schema_version FROM plugin_sessions WHERE session_id = ?")
        .get(sessionId) as { plugin_version: string; schema_version: number } | undefined;
    recordIdentityDrift(
        conn,
        identity.accountHash,
        existingRsn,
        identity.rsn,
        {
            sessionId,
            pluginVersion: session?.plugin_version ?? "unknown",
            schemaVersion: session?.schema_version ?? 0,
            batchSeq: 0,
            batchTick: 0,
        },
        now,
    );
    logger.warn(`[varez/security] rsn_drift acct=${identity.accountHash} old=${existingRsn} new=${identity.rsn}`);
}

export function upsertSession(
    conn: Database.Database,
    sessionId: string,
    identity: PluginIdentityRecord,
    now: number,
): void {
    const worldTypes = identity.worldTypes && identity.worldTypes.length > 0 ? identity.worldTypes.join(",") : null;
    let pluginVersion = identity.pluginVersion;
    let schemaVersion = identity.schemaVersion;
    if (typeof pluginVersion !== "string" || pluginVersion.length === 0) {
        logger.warn(
            `[plugin/session] missing pluginVersion at Identity handshake account=${identity.accountHash} session=${sessionId} — falling back to 'unknown' (PLUGIN-PROTOCOL-ADDITIONS.md §1)`,
        );
        pluginVersion = "unknown";
    }
    if (typeof schemaVersion !== "number") {
        logger.warn(
            `[plugin/session] missing schemaVersion at Identity handshake account=${identity.accountHash} session=${sessionId} — falling back to 0 (PLUGIN-PROTOCOL-ADDITIONS.md §1)`,
        );
        schemaVersion = 0;
    }
    conn.prepare(
        `INSERT INTO plugin_sessions
            (session_id, account_hash, rsn, world, world_types, plugin_version, schema_version, connected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
            account_hash = excluded.account_hash,
            rsn = excluded.rsn,
            world = excluded.world,
            world_types = excluded.world_types,
            plugin_version = excluded.plugin_version,
            schema_version = excluded.schema_version`,
    ).run(sessionId, identity.accountHash, identity.rsn, identity.world, worldTypes, pluginVersion, schemaVersion, now);
}

export function upsertAccount(
    conn: Database.Database,
    identity: PluginIdentityRecord,
    existing: boolean,
    now: number,
): void {
    if (existing) {
        conn.prepare(
            "UPDATE plugin_accounts SET latest_rsn = ?, account_type = COALESCE(?, account_type), last_seen = ? WHERE account_hash = ?",
        ).run(identity.rsn, identity.accountType ?? null, now, identity.accountHash);
    } else {
        conn.prepare(
            "INSERT INTO plugin_accounts (account_hash, first_rsn, latest_rsn, account_type, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(identity.accountHash, identity.rsn, identity.rsn, identity.accountType ?? null, now, now);
    }
}

export function upsertCurrentState(
    conn: Database.Database,
    sessionId: string,
    identity: PluginIdentityRecord,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_current_state
            (account_hash, latest_rsn, world, activity, clan_name, clan_rank, login_state, last_seen_in_game, last_session_id, account_type, first_seen, last_seen, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_hash) DO UPDATE SET
            latest_rsn = excluded.latest_rsn,
            world = excluded.world,
            activity = COALESCE(excluded.activity, plugin_current_state.activity),
            clan_name = excluded.clan_name,
            clan_rank = excluded.clan_rank,
            login_state = excluded.login_state,
            last_seen_in_game = excluded.last_seen_in_game,
            last_session_id = excluded.last_session_id,
            account_type = COALESCE(excluded.account_type, plugin_current_state.account_type),
            last_seen = excluded.last_seen,
            updated_at = excluded.updated_at`,
    ).run(
        identity.accountHash,
        identity.rsn,
        identity.world,
        identity.activity ?? null,
        identity.clanName ?? null,
        identity.clanRank ?? null,
        "LOGGED_IN",
        now,
        sessionId,
        identity.accountType ?? null,
        now,
        now,
        now,
    );
}
