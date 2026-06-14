import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

interface BoostEntry {
    skill?: string;
    diff?: number;
}

function readPriorBoost(conn: Database.Database, accountHash: string, skill: string): number | null {
    const row = conn
        .prepare("SELECT diff FROM plugin_boosts WHERE account_hash = ? AND skill = ?")
        .get(accountHash, skill) as { diff: number } | undefined;
    return row?.diff ?? null;
}

function upsertBoost(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    skill: string,
    diff: number,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_boosts (account_hash, rsn, skill, diff, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, skill) DO UPDATE SET
            rsn = excluded.rsn,
            diff = excluded.diff,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN diff != excluded.diff
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run(accountHash, rsn ?? "", skill, diff, now, now, now);
}

export function handleBoosts(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const entries: BoostEntry[] = Array.isArray(payload.boosts) ? payload.boosts : [];
    const where = extractWhere(payload);
    const insertChange = conn.prepare(
        `INSERT INTO plugin_boosts_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, skill, diff_before, diff_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    const transition = (skill: string, diffBefore: number, diffAfter: number): void => {
        const dedup = rowDedupHash(
            accountHash,
            "boost_change",
            skill,
            diffBefore,
            diffAfter,
            envelope.session_seq,
            where.world ?? 0,
            where.x ?? 0,
            where.y ?? 0,
            where.plane ?? 0,
        );
        insertChange.run(
            accountHash,
            rsn ?? "",
            envelope.session_id,
            envelope.session_seq,
            envelope.event_received_at,
            envelope.plugin_version,
            skill,
            diffBefore,
            diffAfter,
            where.world ?? 0,
            where.x ?? 0,
            where.y ?? 0,
            where.plane ?? 0,
            where.region_id ?? 0,
            where.region_name ?? "",
            where.area,
            dedup,
        );
        upsertBoost(conn, accountHash, rsn, skill, diffAfter, now);
    };
    conn.transaction(() => {
        const seen = new Set<string>();
        for (const entry of entries) {
            const skill = typeof entry.skill === "string" ? entry.skill : null;
            if (skill === null) continue;
            seen.add(skill);
            const diffAfter = typeof entry.diff === "number" ? entry.diff : 0;
            const diffBefore = readPriorBoost(conn, accountHash, skill) ?? 0;
            if (diffBefore !== diffAfter) {
                transition(skill, diffBefore, diffAfter);
            }
        }
        const stale = conn
            .prepare("SELECT skill, diff FROM plugin_boosts WHERE account_hash = ? AND diff != 0")
            .all(accountHash) as { skill: string; diff: number }[];
        for (const row of stale) {
            if (!seen.has(row.skill)) {
                transition(row.skill, row.diff, 0);
            }
        }
    })();
}
