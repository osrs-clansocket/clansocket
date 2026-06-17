import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

interface CatalogRow {
    task_name: string;
    boss_id: number | null;
    boss_name: string | null;
    tier: string;
    task_type: string | null;
    points: number;
}

function lookupCatalog(conn: Database.Database, taskId: number): CatalogRow | null {
    const row = conn
        .prepare(
            `SELECT task_name, boss_id, boss_name, tier, task_type, points
             FROM plugin_combat_achievement_catalog WHERE task_id = ?`,
        )
        .get(taskId) as CatalogRow | undefined;
    return row ?? null;
}

function priorPointsForAccount(conn: Database.Database, accountHash: string): number {
    const row = conn
        .prepare("SELECT COALESCE(SUM(points), 0) AS total FROM plugin_combat_achievements WHERE account_hash = ?")
        .get(accountHash) as { total: number } | undefined;
    return row?.total ?? 0;
}

function upsertAchievement(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    taskId: number,
    taskName: string,
    bossId: number | null,
    bossName: string | null,
    tier: string,
    taskType: string | null,
    points: number,
    completedAt: number,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_combat_achievements
            (account_hash, rsn, task_id, task_name, boss_id, boss_name, tier, task_type, points, completed_at, first_seen, last_seen, updated_at)
         VALUES ($accountHash, $rsn, $taskId, $taskName, $bossId, $bossName, $tier, $taskType, $points, $completedAt, $now, $now, $now)
         ON CONFLICT (account_hash, task_id) DO UPDATE SET
            rsn = excluded.rsn,
            task_name = excluded.task_name,
            boss_id = excluded.boss_id,
            boss_name = excluded.boss_name,
            tier = excluded.tier,
            task_type = excluded.task_type,
            points = excluded.points,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN task_name != excluded.task_name OR tier != excluded.tier OR points != excluded.points
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run({
        accountHash,
        rsn: rsn ?? "",
        taskId,
        taskName,
        bossId,
        bossName,
        tier,
        taskType,
        points,
        completedAt,
        now,
    });
}

export function handleCombatAchievement(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const taskId = typeof payload.taskId === "number" ? payload.taskId : null;
    if (taskId === null) return;
    const where = extractWhere(payload);
    const catalog = lookupCatalog(conn, taskId);
    const payloadName = typeof payload.name === "string" ? payload.name : null;
    const taskName = catalog?.task_name ?? payloadName ?? "";
    const bossId = catalog?.boss_id ?? (typeof payload.bossId === "number" ? payload.bossId : null);
    const bossName = catalog?.boss_name ?? (typeof payload.bossName === "string" ? payload.bossName : null);
    const tier = catalog?.tier ?? (typeof payload.tier === "string" ? payload.tier : "");
    const taskType = catalog?.task_type ?? (typeof payload.taskType === "string" ? payload.taskType : null);
    const points = typeof payload.points === "number" ? payload.points : (catalog?.points ?? 0);
    const pointsBefore =
        typeof payload.pointsBefore === "number" ? payload.pointsBefore : priorPointsForAccount(conn, accountHash);
    const pointsAfter = pointsBefore + points;
    const dedup = rowDedupHash(
        accountHash,
        "combat_achievement",
        taskId,
        points,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    conn.transaction(() => {
        conn.prepare(
            `INSERT INTO plugin_combat_achievements_changes
                (account_hash, rsn, session_id, session_seq, event_received_at,
                 plugin_version, task_id, task_name, boss_id, boss_name, tier, task_type,
                 points_before, points_after,
                 world, x, y, plane, region_id, region_name, area, dedup_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(dedup_hash) DO NOTHING`,
        ).run(
            accountHash,
            rsn ?? "",
            envelope.session_id,
            envelope.session_seq,
            envelope.event_received_at,
            envelope.plugin_version,
            taskId,
            taskName,
            bossId,
            bossName,
            tier,
            taskType,
            pointsBefore,
            pointsAfter,
            where.world ?? 0,
            where.x ?? 0,
            where.y ?? 0,
            where.plane ?? 0,
            where.region_id ?? 0,
            where.region_name ?? "",
            where.area,
            dedup,
        );
        upsertAchievement(conn, accountHash, rsn, taskId, taskName, bossId, bossName, tier, taskType, points, now, now);
    })();
}

export function handleCombatAchievementsSnapshot(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    _envelope: EventEnvelopeCols,
): void {
    const tasks: number[] = Array.isArray(payload.completedTasks) ? payload.completedTasks : [];
    conn.transaction(() => {
        for (const taskId of tasks) {
            if (typeof taskId !== "number") continue;
            const catalog = lookupCatalog(conn, taskId);
            if (catalog === null) continue;
            upsertAchievement(
                conn,
                accountHash,
                rsn,
                taskId,
                catalog.task_name,
                catalog.boss_id,
                catalog.boss_name,
                catalog.tier,
                catalog.task_type,
                catalog.points,
                now,
                now,
            );
        }
    })();
}
