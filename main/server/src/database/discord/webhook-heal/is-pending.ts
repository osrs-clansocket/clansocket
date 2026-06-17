import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const TARGET_KIND_WEBHOOK_HEAL = "webhook_heal";
const PENDING_STATUSES = ["pending", "in_flight"] as const;

const SELECT_SQL = `SELECT 1 AS hit
    FROM discord_outbound_events
    WHERE target_kind = ?
      AND target_id = ?
      AND status IN ('pending', 'in_flight')
    LIMIT 1`;

export function isWebhookHealPending(webhookId: string): boolean {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const row = db.prepare(SELECT_SQL).get(TARGET_KIND_WEBHOOK_HEAL, webhookId) as { hit: number } | undefined;
    return row !== undefined;
}

export { PENDING_STATUSES };
