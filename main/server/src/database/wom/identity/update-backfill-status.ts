import { getClanDb } from "../../core/database.js";

export type BackfillStatus = "completed" | "failed" | "in_progress";

const UPDATE_SQL = `UPDATE clan_wom_identity
    SET last_backfill_at = ?, last_backfill_status = ?, next_backfill_eligible_at = ?
    WHERE singleton_key = 'default'`;

export function updateBackfillStatus(clanId: string, status: BackfillStatus, nextEligibleAtMs: number): boolean {
    const result = getClanDb(clanId).prepare(UPDATE_SQL).run(Date.now(), status, nextEligibleAtMs);
    return result.changes > 0;
}
