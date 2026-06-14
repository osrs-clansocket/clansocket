import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

function readPriorCount(conn: Database.Database, accountHash: string, tier: string): number | null {
    const row = conn
        .prepare("SELECT count FROM plugin_clues WHERE account_hash = ? AND tier = ?")
        .get(accountHash, tier) as { count: number } | undefined;
    return row?.count ?? null;
}

function upsertClue(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    tier: string,
    count: number,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_clues (account_hash, rsn, tier, count, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, tier) DO UPDATE SET
            rsn = excluded.rsn,
            count = excluded.count,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN count != excluded.count
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run(accountHash, rsn ?? "", tier, count, now, now, now);
}

function insertChange(
    insert: Database.Statement,
    accountHash: string,
    rsn: string | null,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    tier: string,
    countBefore: number,
    countAfter: number,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "clue_change",
        tier,
        countBefore,
        countAfter,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    insert.run(
        accountHash,
        rsn ?? "",
        envelope.session_id,
        envelope.session_seq,
        envelope.event_received_at,
        envelope.plugin_version,
        tier,
        countBefore,
        countAfter,
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

export function handleClueCompleted(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const tier = typeof payload.tier === "string" ? payload.tier : null;
    if (tier === null) return;
    const countAfter = typeof payload.total === "number" ? payload.total : 0;
    const countBefore =
        typeof payload.cluesCompletedBefore === "number"
            ? payload.cluesCompletedBefore
            : (readPriorCount(conn, accountHash, tier) ?? Math.max(0, countAfter - 1));
    const where = extractWhere(payload);
    const insertStmt = conn.prepare(
        `INSERT INTO plugin_clues_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, tier, count_before, count_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        insertChange(insertStmt, accountHash, rsn, envelope, where, tier, countBefore, countAfter);
        upsertClue(conn, accountHash, rsn, tier, countAfter, now);
    })();
}

export function handleClueOpened(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    _now: number,
    envelope: EventEnvelopeCols,
): void {
    const tier = typeof payload.tier === "string" ? payload.tier : null;
    if (tier === null) return;
    const current = readPriorCount(conn, accountHash, tier) ?? 0;
    const where = extractWhere(payload);
    const insertStmt = conn.prepare(
        `INSERT INTO plugin_clues_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, tier, count_before, count_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    insertChange(insertStmt, accountHash, rsn, envelope, where, tier, current, current);
}
