import { getClanAuditDb } from "../../../../core/database.js";
import { resolveActorDisplays } from "./actor-displays.js";
import { rowToEntry } from "./row-to-entry.js";
import {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    type AuditRow,
    type ListClanAuditOptions,
    type ListClanAuditResult,
} from "./types.js";

export type { ActorKind, ClanAuditEntry, ListClanAuditOptions, ListClanAuditResult } from "./types.js";
export { broadcastEntryById } from "./broadcast.js";
export { rowToEntry } from "./row-to-entry.js";
export { resolveActorDisplays } from "./actor-displays.js";

export function listClanAuditEntries(clanId: string, opts: ListClanAuditOptions = {}): ListClanAuditResult {
    const before = opts.before ?? Date.now();
    const after = opts.after ?? 0;
    const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT));
    const db = getClanAuditDb(clanId);

    const clauses = ["ts < ?", "ts >= ?"];
    const params: unknown[] = [before, after];
    if (opts.kindPrefix && opts.kindPrefix.length > 0) {
        clauses.push("action LIKE ?");
        params.push(`${opts.kindPrefix}%`);
    }
    if (opts.kindExclude && opts.kindExclude.length > 0) {
        clauses.push("action NOT LIKE ?");
        params.push(`${opts.kindExclude}%`);
    }
    if (opts.actorSiteAccountId && opts.actorSiteAccountId.length > 0) {
        clauses.push("actor_site_account_id = ?");
        params.push(opts.actorSiteAccountId);
    }
    params.push(limit);
    const rows = db
        .prepare(
            `SELECT id, ts, actor_site_account_id, actor_kind, action, source, schema_version, target_type, target_id, payload_json, request_id, elapsed_ms
             FROM clan_audit_log
             WHERE ${clauses.join(" AND ")}
             ORDER BY ts DESC
             LIMIT ?`,
        )
        .all(...params) as AuditRow[];

    const entries = rows.map(rowToEntry);
    const actorIds = Array.from(
        new Set(entries.map((e) => e.actorSiteAccountId).filter((id): id is string => id !== null)),
    );
    const displays = resolveActorDisplays(clanId, actorIds);
    for (const entry of entries) {
        if (entry.actorSiteAccountId !== null) {
            entry.actorDisplay = displays.get(entry.actorSiteAccountId) ?? null;
        }
    }
    const hasMore = entries.length === limit;
    const nextBefore = entries.length > 0 ? entries[entries.length - 1]!.ts : null;
    return { entries, hasMore, nextBefore };
}
