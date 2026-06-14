import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

function readPriorActive(conn: Database.Database, accountHash: string, effect: string): number | null {
    const row = conn
        .prepare("SELECT active FROM plugin_status_effects WHERE account_hash = ? AND effect = ?")
        .get(accountHash, effect) as { active: number } | undefined;
    return row?.active ?? null;
}

export function handleStatusEffect(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const effect = typeof payload.effect === "string" ? payload.effect : null;
    if (effect === null) return;
    const incomingActive = payload.active === true || payload.active === 1 ? 1 : 0;
    const prior = readPriorActive(conn, accountHash, effect);
    const where = extractWhere(payload);
    conn.transaction(() => {
        if (prior === null || prior !== incomingActive) {
            const qtySigned = incomingActive === 1 ? 1 : -1;
            const dedup = rowDedupHash(
                accountHash,
                "status_effect_change",
                effect,
                qtySigned,
                envelope.session_seq,
                where.world ?? 0,
                where.x ?? 0,
                where.y ?? 0,
                where.plane ?? 0,
            );
            conn.prepare(
                `INSERT INTO plugin_status_effects_changes
                    (account_hash, rsn, session_id, session_seq, event_received_at,
                     plugin_version, effect, qty_signed,
                     world, x, y, plane, region_id, region_name, area, dedup_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(dedup_hash) DO NOTHING`,
            ).run(
                accountHash,
                rsn ?? "",
                envelope.session_id,
                envelope.session_seq,
                envelope.event_received_at,
                envelope.plugin_version,
                effect,
                qtySigned,
                where.world ?? 0,
                where.x ?? 0,
                where.y ?? 0,
                where.plane ?? 0,
                where.region_id ?? 0,
                where.region_name ?? "",
                where.area,
                dedup,
            );
        }
        conn.prepare(
            `INSERT INTO plugin_status_effects (account_hash, rsn, effect, active, first_seen, last_seen, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (account_hash, effect) DO UPDATE SET
                rsn = excluded.rsn,
                active = excluded.active,
                last_seen = excluded.last_seen,
                updated_at = CASE
                    WHEN active != excluded.active
                    THEN excluded.updated_at
                    ELSE updated_at
                END`,
        ).run(accountHash, rsn ?? "", effect, incomingActive, now, now, now);
    })();
}
