import logger from "@clansocket/logger";
import { getClanAuditDb } from "../../../../core/database.js";
import { broadcastClanAuditEntry } from "../../clan-audit-stream.js";
import { resolveActorDisplays } from "./actor-displays.js";
import { rowToEntry } from "./row-to-entry.js";
import type { AuditRow } from "./types.js";

export function broadcastEntryById(clanId: string, id: number): void {
    try {
        const row = getClanAuditDb(clanId)
            .prepare(
                `SELECT id, ts, actor_site_account_id, actor_kind, action, source, schema_version, target_type, target_id, payload_json, request_id, elapsed_ms
                 FROM clan_audit_log WHERE id = ?`,
            )
            .get(id) as AuditRow | undefined;
        if (!row) return;
        const entry = rowToEntry(row);
        if (entry.actorSiteAccountId !== null) {
            const displays = resolveActorDisplays(clanId, [entry.actorSiteAccountId]);
            entry.actorDisplay = displays.get(entry.actorSiteAccountId) ?? null;
        }
        broadcastClanAuditEntry(clanId, entry);
    } catch (err) {
        logger.warn(`[clansocket_audit] broadcast failed for id=${id}: ${(err as Error).message}`);
    }
}
