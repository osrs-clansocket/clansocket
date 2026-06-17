import { getClanDb } from "../../core/database.js";

const SELECT_SQL = `SELECT last_backfill_at FROM clan_wom_identity WHERE singleton_key = 'default'`;
const UPDATE_SQL = `UPDATE clan_wom_identity
    SET last_backfill_status = 'completed'
    WHERE singleton_key = 'default'`;

export interface BackfillCompletionResult {
    startedAtMs: number | null;
    changed: boolean;
}

export function markBackfillCompleted(clanId: string): BackfillCompletionResult {
    const db = getClanDb(clanId);
    const startRow = db.prepare(SELECT_SQL).get() as { last_backfill_at: number | null } | undefined;
    const result = db.prepare(UPDATE_SQL).run();
    return { startedAtMs: startRow?.last_backfill_at ?? null, changed: result.changes > 0 };
}
