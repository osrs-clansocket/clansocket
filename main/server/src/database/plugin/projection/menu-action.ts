import type Database from "better-sqlite3";
import { ensureCurrentStateRow } from "./current-state.js";
import type { Payload } from "./helpers.js";

export function handleMenuAction(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    ensureCurrentStateRow(conn, accountHash, rsn, now);
    const action = typeof payload.action === "string" ? payload.action : null;
    const option = typeof payload.option === "string" ? payload.option : null;
    const targetKind = typeof payload.targetKind === "string" ? payload.targetKind : null;
    const target = typeof payload.target === "string" ? payload.target : null;
    const targetId = typeof payload.id === "number" ? payload.id : null;
    conn.prepare(
        `UPDATE plugin_current_state
            SET last_menu_action = ?, last_menu_action_option = ?,
                last_menu_action_target_kind = ?, last_menu_action_target = ?,
                last_menu_action_target_id = ?, last_menu_action_at = ?, last_seen = ?, updated_at = ?
            WHERE account_hash = ?`,
    ).run(action, option, targetKind, target, targetId, now, now, now, accountHash);
}
