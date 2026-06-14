import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

interface SkillEntry {
    name?: string;
    skill?: string;
    level?: number;
    boosted?: number;
    xp?: number;
}

interface PriorStat {
    level: number;
    xp: number;
}

function readPriorStat(conn: Database.Database, accountHash: string, skill: string): PriorStat | null {
    const row = conn
        .prepare("SELECT level, xp FROM plugin_stats WHERE account_hash = ? AND skill = ?")
        .get(accountHash, skill) as PriorStat | undefined;
    return row ?? null;
}

function upsertStat(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    skill: string,
    level: number,
    boosted: number,
    xp: number,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_stats (account_hash, rsn, skill, level, boosted, xp, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, skill) DO UPDATE SET
            rsn = excluded.rsn,
            level = excluded.level,
            boosted = excluded.boosted,
            xp = excluded.xp,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN level != excluded.level OR boosted != excluded.boosted OR xp != excluded.xp
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run(accountHash, rsn ?? "", skill, level, boosted, xp, now, now, now);
}

function insertStatChange(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    skill: string,
    levelBefore: number,
    levelAfter: number,
    xpBefore: number,
    xpAfter: number,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "stats_change",
        skill,
        levelBefore,
        levelAfter,
        xpBefore,
        xpAfter,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    conn.prepare(
        `INSERT INTO plugin_stats_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, skill, level_before, level_after, xp_before, xp_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    ).run(
        accountHash,
        rsn ?? "",
        envelope.session_id,
        envelope.session_seq,
        envelope.event_received_at,
        envelope.plugin_version,
        skill,
        levelBefore,
        levelAfter,
        xpBefore,
        xpAfter,
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

export function handleStats(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    const skills: SkillEntry[] = Array.isArray(payload.skills) ? payload.skills : [];
    conn.transaction(() => {
        for (const entry of skills) {
            const skill =
                typeof entry.name === "string" ? entry.name : typeof entry.skill === "string" ? entry.skill : null;
            if (skill === null) continue;
            const level = typeof entry.level === "number" ? entry.level : 0;
            const boosted = typeof entry.boosted === "number" ? entry.boosted : level;
            const xp = typeof entry.xp === "number" ? entry.xp : 0;
            upsertStat(conn, accountHash, rsn, skill, level, boosted, xp, now);
        }
    })();
}

export function handleLevelUp(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const skill = typeof payload.skill === "string" ? payload.skill : null;
    if (skill === null) return;
    const where = extractWhere(payload);
    const levelAfter = typeof payload.level === "number" ? payload.level : 0;
    const levelBefore =
        typeof payload.levelBefore === "number"
            ? payload.levelBefore
            : (readPriorStat(conn, accountHash, skill)?.level ?? levelAfter);
    const xpBefore =
        typeof payload.xpBefore === "number" ? payload.xpBefore : (readPriorStat(conn, accountHash, skill)?.xp ?? 0);
    const xpGained = typeof payload.xpGained === "number" ? payload.xpGained : 0;
    const xpAfter = xpBefore + xpGained;
    conn.transaction(() => {
        insertStatChange(conn, accountHash, rsn, envelope, where, skill, levelBefore, levelAfter, xpBefore, xpAfter);
        upsertStat(conn, accountHash, rsn, skill, levelAfter, levelAfter, xpAfter, now);
    })();
}

export function handleXpGained(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    const skill = typeof payload.skill === "string" ? payload.skill : null;
    const xpAfter = typeof payload.xp === "number" ? payload.xp : null;
    if (skill === null || xpAfter === null) return;
    const prior = readPriorStat(conn, accountHash, skill);
    if (prior !== null && prior.xp === xpAfter) return;
    const level = prior?.level ?? 0;
    upsertStat(conn, accountHash, rsn, skill, level, level, xpAfter, now);
}
