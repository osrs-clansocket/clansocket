import type Database from "better-sqlite3";
import { rowDedupHash } from "./envelope.js";

interface DriftSessionMetadata {
    sessionId: string;
    pluginVersion: string;
    schemaVersion: number;
    batchSeq: number;
    batchTick: number;
}

export function recordIdentityDrift(
    conn: Database.Database,
    accountHash: string,
    oldRsn: string,
    newRsn: string,
    session: DriftSessionMetadata,
    now: number,
): void {
    const dedup = rowDedupHash(accountHash, "identity_drift", oldRsn, newRsn, session.batchTick);
    conn.prepare(
        `INSERT INTO plugin_identity_drifts
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, old_rsn, new_rsn,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    ).run(
        accountHash,
        newRsn,
        session.sessionId,
        session.batchSeq,
        session.batchTick,
        now,
        now,
        session.pluginVersion,
        session.schemaVersion,
        oldRsn,
        newRsn,
        dedup,
    );
}
