import logger from "@clansocket/logger";
import { DB_NAMES, getClanAuditDb, getDb } from "../../../core/database.js";
import { auditContext } from "../../../../shared/audit-context.js";
import { lookupAction, validatePayload, type AnyAuditAction, type PayloadFor } from "../clan-audit-registry/index.js";
import { getLastRowHash, hashRow } from "./chain.js";
import { type ActorKind, broadcastEntryById } from "./list/index.js";

export interface RecordClanAuditEntry<A extends AnyAuditAction = AnyAuditAction> {
    actor: string | null;
    actorKind?: ActorKind;
    action: A;
    targetId?: string | null;
    guildId?: string | null;
    payload: PayloadFor<A>;
}

function sourceFromAction(action: string): string {
    const colon = action.indexOf(":");
    return colon === -1 ? "server" : action.slice(0, colon);
}

function resolveTargetName(targetType: string | null, targetId: string | null): string | null {
    if (targetType === null || targetId === null) return null;
    const appDb = getDb(DB_NAMES.APP);
    if (targetType === "clan") {
        const row = appDb.prepare("SELECT display_name FROM clansocket_clans WHERE id = ?").get(targetId) as
            | { display_name: string }
            | undefined;
        return row?.display_name ?? null;
    }
    if (targetType === "account" || targetType === "site_account" || targetType === "manager") {
        const row = appDb.prepare("SELECT display_name FROM clansocket_accounts WHERE id = ?").get(targetId) as
            | { display_name: string }
            | undefined;
        return row?.display_name ?? null;
    }
    return null;
}

export function recordClanAudit<A extends AnyAuditAction>(clanId: string, entry: RecordClanAuditEntry<A>): void {
    const def = lookupAction(entry.action);
    if (!def) {
        logger.warn(`[clansocket_audit] unknown action kind ${entry.action} — writing with defaults`);
    }
    const ctx = auditContext.getStore();
    const now = Date.now();
    const elapsedMs = ctx ? now - ctx.startMs : null;
    const enriched: Record<string, unknown> = { ...(entry.payload as Record<string, unknown>) };
    if (ctx?.causedBy) enriched.causedBy = ctx.causedBy;
    if (ctx?.requestId) enriched.requestId = ctx.requestId;
    if (elapsedMs !== null) enriched.elapsedMs = elapsedMs;
    if (def && !validatePayload(entry.action, enriched)) {
        logger.warn(`[clansocket_audit] payload validation failed for ${entry.action}`);
    }
    const db = getClanAuditDb(clanId);

    let insertedId = -1;
    const insertTx = db.transaction(() => {
        const prevHash = getLastRowHash(db);
        const source = def?.source ?? sourceFromAction(entry.action);
        const schemaVersion = def?.schemaVersion ?? 1;
        const targetType = def?.targetType ?? null;
        const targetId = entry.targetId ?? null;
        const targetName = resolveTargetName(targetType, targetId);
        const payloadJson = JSON.stringify(enriched);
        const rowHash = hashRow({
            ts: now,
            actor: entry.actor,
            action: entry.action,
            source,
            schemaVersion,
            targetType,
            targetId,
            payloadJson,
            prevHash,
        });
        const result = db
            .prepare(
                `INSERT INTO clan_audit_log
                (ts, actor_site_account_id, actor_kind, action, source, schema_version, target_type, target_id, target_name, guild_id, payload_json, request_id, elapsed_ms, prev_hash, row_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                now,
                entry.actor,
                entry.actorKind ?? "user",
                entry.action,
                source,
                schemaVersion,
                targetType,
                targetId,
                targetName,
                entry.guildId ?? null,
                payloadJson,
                ctx?.requestId ?? null,
                elapsedMs,
                prevHash,
                rowHash,
            );
        insertedId = Number(result.lastInsertRowid);
    });
    insertTx();
    if (insertedId > 0) broadcastEntryById(clanId, insertedId);
}
