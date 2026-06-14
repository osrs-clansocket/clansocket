import type Database from "better-sqlite3";
import type { Payload } from "./helpers.js";

export function ensureCurrentStateRow(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_current_state (account_hash, latest_rsn, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(account_hash) DO UPDATE SET last_seen = excluded.last_seen`,
    ).run(accountHash, rsn ?? "", now, now, now);
}

export function handleVitals(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    ensureCurrentStateRow(conn, accountHash, rsn, now);
    conn.prepare(
        `UPDATE plugin_current_state
            SET energy = ?, weight = ?, spec = ?, hitpoints = ?, prayer = ?, max_hitpoints = ?, max_prayer = ?, last_seen = ?, updated_at = ?
            WHERE account_hash = ?`,
    ).run(
        typeof payload.energy === "number" ? payload.energy : null,
        typeof payload.weight === "number" ? payload.weight : null,
        typeof payload.spec === "number" ? payload.spec : null,
        typeof payload.hitpoints === "number" ? payload.hitpoints : null,
        typeof payload.prayer === "number" ? payload.prayer : null,
        typeof payload.maxHitpoints === "number" ? payload.maxHitpoints : null,
        typeof payload.maxPrayer === "number" ? payload.maxPrayer : null,
        now,
        now,
        accountHash,
    );
}

export function handleInteracting(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    ensureCurrentStateRow(conn, accountHash, rsn, now);
    const kind = typeof payload.targetKind === "string" ? payload.targetKind : null;
    const id = typeof payload.targetId === "number" ? payload.targetId : null;
    const name = kind === "PLAYER" ? null : typeof payload.targetName === "string" ? payload.targetName : null;
    conn.prepare(
        `UPDATE plugin_current_state
            SET interacting_kind = ?, interacting_id = ?, interacting_name = ?, last_seen = ?, updated_at = ?
            WHERE account_hash = ?`,
    ).run(kind, id, name, now, now, accountHash);
}
