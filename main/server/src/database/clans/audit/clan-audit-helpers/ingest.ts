import { getClanAuditDb } from "../../../core/database.js";
import { auditContext } from "../../../../shared/audit-context.js";
import { getLastRowHash, hashRow } from "./chain.js";
import { type ActorKind, broadcastEntryById } from "./list/index.js";

export interface ClientAuditEntry {
    sessionId: string;
    seq: number;
    ts: number;
    action: string;
    target?: string | null;
    meta?: Record<string, unknown> | null;
    actor_kind?: ActorKind;
}

export interface IngestResult {
    accepted: number;
    ignored: number;
}

export function ingestClientAuditBatch(
    clanId: string,
    actorSiteAccountId: string,
    entries: readonly ClientAuditEntry[],
): IngestResult {
    if (entries.length === 0) return { accepted: 0, ignored: 0 };
    const ctx = auditContext.getStore();
    const db = getClanAuditDb(clanId);
    const dupCheck = db.prepare(`SELECT 1 FROM clan_audit_log WHERE session_id = ? AND seq = ? LIMIT 1`);
    const insertStmt = db.prepare(
        `INSERT INTO clan_audit_log
            (ts, actor_site_account_id, actor_kind, action, source, schema_version, target_type, target_id, payload_json, session_id, seq, request_id, elapsed_ms, prev_hash, row_hash)
         VALUES (?, ?, ?, ?, 'client', 1, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let accepted = 0;
    let ignored = 0;
    const insertedIds: number[] = [];
    const tx = db.transaction((es: readonly ClientAuditEntry[]) => {
        for (const e of es) {
            if (dupCheck.get(e.sessionId, e.seq)) {
                ignored += 1;
                continue;
            }
            const payloadJson = e.meta ? JSON.stringify(e.meta) : null;
            const prevHash = getLastRowHash(db);
            const rowHash = hashRow({
                ts: e.ts,
                actor: actorSiteAccountId,
                action: e.action,
                source: "client",
                schemaVersion: 1,
                targetType: null,
                targetId: e.target ?? null,
                payloadJson,
                prevHash,
            });
            const result = insertStmt.run(
                e.ts,
                actorSiteAccountId,
                e.actor_kind ?? "user",
                e.action,
                e.target ?? null,
                payloadJson,
                e.sessionId,
                e.seq,
                ctx?.requestId ?? null,
                ctx ? Date.now() - ctx.startMs : null,
                prevHash,
                rowHash,
            );
            insertedIds.push(Number(result.lastInsertRowid));
            accepted += 1;
        }
    });
    tx(entries);
    for (const id of insertedIds) broadcastEntryById(clanId, id);
    return { accepted, ignored };
}
