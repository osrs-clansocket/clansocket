import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

export function handleWorldHop(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const fromWorld = typeof payload.fromWorld === "number" ? payload.fromWorld : 0;
    const toWorld = typeof payload.toWorld === "number" ? payload.toWorld : 0;
    const where = extractWhere(payload);
    const dedup = rowDedupHash(
        accountHash,
        "world_hop",
        fromWorld,
        toWorld,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    conn.transaction(() => {
        conn.prepare(
            `INSERT INTO plugin_world_hops
                (account_hash, rsn, session_id, session_seq, event_received_at,
                 plugin_version, from_world, to_world,
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
            fromWorld,
            toWorld,
            where.world ?? null,
            where.x ?? null,
            where.y ?? null,
            where.plane ?? null,
            where.region_id ?? null,
            where.region_name ?? null,
            where.area,
            dedup,
        );
        conn.prepare(
            `UPDATE plugin_current_state SET world = ?, last_seen = ?, updated_at = ? WHERE account_hash = ?`,
        ).run(toWorld, now, now, accountHash);
    })();
}
