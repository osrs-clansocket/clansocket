import { getDb, DB_NAMES } from "../database/index.js";
import { MS_PER_MINUTE } from "../shared/time.js";

export type DataActionKind =
    | "user.export"
    | "user.delete"
    | "user.row_delete"
    | "user.bulk_delete"
    | "clan.export"
    | "clan.deleted"
    | "clan.auto_purged";

const COOLDOWN_MS = 5 * MS_PER_MINUTE;

export interface CooldownCheck {
    ok: boolean;
    lastAt?: number;
    retryAfterMs?: number;
}

export function checkCooldown(siteAccountId: string, kind: DataActionKind, targetId: string | null): CooldownCheck {
    const db = getDb(DB_NAMES.APP);
    const row = db
        .prepare(
            `SELECT performed_at
             FROM clansocket_data_action_log
             WHERE site_account_id = ? AND kind = ? AND target_id IS ?
             ORDER BY performed_at DESC LIMIT 1`,
        )
        .get(siteAccountId, kind, targetId) as { performed_at: number } | undefined;
    if (!row) return { ok: true };
    const elapsed = Date.now() - row.performed_at;
    if (elapsed >= COOLDOWN_MS) return { ok: true, lastAt: row.performed_at };
    return { ok: false, lastAt: row.performed_at, retryAfterMs: COOLDOWN_MS - elapsed };
}

export function recordAction(siteAccountId: string, kind: DataActionKind, targetId: string | null): void {
    const db = getDb(DB_NAMES.APP);
    db.prepare(
        `INSERT INTO clansocket_data_action_log (site_account_id, kind, target_id, performed_at)
         VALUES (?, ?, ?, ?)`,
    ).run(siteAccountId, kind, targetId, Date.now());
}
