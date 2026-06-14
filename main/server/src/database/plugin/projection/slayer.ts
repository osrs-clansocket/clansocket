import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

interface PriorSlayer {
    target_id: number | null;
    count: number | null;
}

function readPriorSlayer(conn: Database.Database, accountHash: string): PriorSlayer | null {
    const row = conn.prepare("SELECT target_id, count FROM plugin_slayer WHERE account_hash = ?").get(accountHash) as
        | PriorSlayer
        | undefined;
    return row ?? null;
}

function asNumberOrNull(v: unknown): number | null {
    return typeof v === "number" ? v : null;
}

function asStringOrNull(v: unknown): string | null {
    return typeof v === "string" ? v : null;
}

export function handleSlayer(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const targetId = asNumberOrNull(payload.target);
    const targetName = asStringOrNull(payload.targetName);
    const areaId = asNumberOrNull(payload.area);
    const areaName = asStringOrNull(payload.areaName);
    const masterId = asNumberOrNull(payload.master);
    const masterName = asStringOrNull(payload.masterName);
    const points = typeof payload.points === "number" ? payload.points : 0;
    const tasksCompleted = typeof payload.tasksCompleted === "number" ? payload.tasksCompleted : 0;
    const bossId = asNumberOrNull(payload.bossId);
    const bossName = asStringOrNull(payload.bossName);
    const count = asNumberOrNull(payload.count);
    const countOriginal = asNumberOrNull(payload.countOriginal);
    const wildyTasksCompleted = typeof payload.wildyTasksCompleted === "number" ? payload.wildyTasksCompleted : 0;
    const where = extractWhere(payload);

    conn.transaction(() => {
        const prior = readPriorSlayer(conn, accountHash);
        const isSameTask = prior !== null && prior.target_id === targetId;
        const countChanged = prior !== null && isSameTask && prior.count !== count;
        if (countChanged && targetId !== null && targetName !== null && count !== null) {
            const countBefore = prior?.count ?? count;
            const dedup = rowDedupHash(
                accountHash,
                "slayer_change",
                targetId,
                countBefore,
                count,
                envelope.session_seq,
                where.world ?? 0,
                where.x ?? 0,
                where.y ?? 0,
                where.plane ?? 0,
            );
            conn.prepare(
                `INSERT INTO plugin_slayer_changes
                    (account_hash, rsn, session_id, session_seq, event_received_at,
                     plugin_version, target_id, target_name,
                     count_remaining_before, count_remaining_after,
                     world, x, y, plane, region_id, region_name, area, dedup_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(dedup_hash) DO NOTHING`,
            ).run(
                accountHash,
                rsn ?? "",
                envelope.session_id,
                envelope.session_seq,
                envelope.event_received_at,
                envelope.plugin_version,
                targetId,
                targetName,
                countBefore,
                count,
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
            `INSERT INTO plugin_slayer
                (account_hash, rsn, target_id, target_name,
                 area_id, area_name, master_id, master_name, points, tasks_completed,
                 boss_id, boss_name, count, count_original, wildy_tasks_completed, first_seen, last_seen, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (account_hash) DO UPDATE SET
                rsn = excluded.rsn,
                target_id = excluded.target_id,
                target_name = excluded.target_name,
                area_id = excluded.area_id,
                area_name = excluded.area_name,
                master_id = excluded.master_id,
                master_name = excluded.master_name,
                points = excluded.points,
                tasks_completed = excluded.tasks_completed,
                boss_id = excluded.boss_id,
                boss_name = excluded.boss_name,
                count = excluded.count,
                count_original = excluded.count_original,
                wildy_tasks_completed = excluded.wildy_tasks_completed,
                last_seen = excluded.last_seen,
                updated_at = CASE
                    WHEN target_id IS NOT excluded.target_id
                      OR count IS NOT excluded.count
                      OR points != excluded.points
                      OR tasks_completed != excluded.tasks_completed
                    THEN excluded.updated_at
                    ELSE updated_at
                END`,
        ).run(
            accountHash,
            rsn ?? "",
            targetId,
            targetName,
            areaId,
            areaName,
            masterId,
            masterName,
            points,
            tasksCompleted,
            bossId,
            bossName,
            count,
            countOriginal,
            wildyTasksCompleted,
            now,
            now,
            now,
        );
    })();
}
