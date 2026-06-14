import type Database from "better-sqlite3";
import { createHash } from "node:crypto";

export interface HashableRow {
    ts: number;
    actor: string | null;
    action: string;
    source: string;
    schemaVersion: number;
    targetType: string | null;
    targetId: string | null;
    payloadJson: string | null;
    prevHash: string | null;
}

function canonicalize(row: HashableRow): string {
    return JSON.stringify({
        ts: row.ts,
        actor: row.actor,
        action: row.action,
        source: row.source,
        schema_version: row.schemaVersion,
        target_type: row.targetType,
        target_id: row.targetId,
        payload_json: row.payloadJson,
        prev_hash: row.prevHash,
    });
}

export function hashRow(row: HashableRow): string {
    return createHash("sha256").update(canonicalize(row)).digest("hex");
}

export function getLastRowHash(db: Database.Database): string | null {
    const row = db.prepare("SELECT row_hash FROM clan_audit_log ORDER BY id DESC LIMIT 1").get() as
        | { row_hash: string }
        | undefined;
    return row?.row_hash ?? null;
}
