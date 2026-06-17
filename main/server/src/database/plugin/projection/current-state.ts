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
         VALUES ($accountHash, $rsn, $now, $now, $now)
         ON CONFLICT(account_hash) DO UPDATE SET last_seen = excluded.last_seen`,
    ).run({ accountHash, rsn: rsn ?? "", now });
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
            SET energy = $energy, weight = $weight, spec = $spec,
                hitpoints = $hitpoints, prayer = $prayer,
                max_hitpoints = $maxHitpoints, max_prayer = $maxPrayer,
                last_seen = $now, updated_at = $now
            WHERE account_hash = $accountHash`,
    ).run({
        energy: typeof payload.energy === "number" ? payload.energy : null,
        weight: typeof payload.weight === "number" ? payload.weight : null,
        spec: typeof payload.spec === "number" ? payload.spec : null,
        hitpoints: typeof payload.hitpoints === "number" ? payload.hitpoints : null,
        prayer: typeof payload.prayer === "number" ? payload.prayer : null,
        maxHitpoints: typeof payload.maxHitpoints === "number" ? payload.maxHitpoints : null,
        maxPrayer: typeof payload.maxPrayer === "number" ? payload.maxPrayer : null,
        now,
        accountHash,
    });
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
            SET interacting_kind = $kind, interacting_id = $id, interacting_name = $name,
                last_seen = $now, updated_at = $now
            WHERE account_hash = $accountHash`,
    ).run({ kind, id, name, now, accountHash });
}
