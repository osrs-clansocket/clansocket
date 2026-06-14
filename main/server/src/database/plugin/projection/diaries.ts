import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { deriveDiaryId, deriveDiaryName, extractWhere, type Payload } from "./helpers.js";

interface DiaryEntry {
    region: string;
    tier: string;
    complete?: boolean;
}

function readPriorTier(conn: Database.Database, accountHash: string, diaryId: string): string | null {
    const row = conn
        .prepare("SELECT tier FROM plugin_diaries WHERE account_hash = ? AND diary_id = ?")
        .get(accountHash, diaryId) as { tier: string } | undefined;
    return row?.tier ?? null;
}

function upsertDiary(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    diaryId: string,
    diaryName: string,
    region: string,
    tier: string,
    complete: number,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_diaries (account_hash, rsn, diary_id, diary_name, diary_region, tier, complete, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, diary_id) DO UPDATE SET
            rsn = excluded.rsn,
            diary_name = excluded.diary_name,
            diary_region = excluded.diary_region,
            tier = excluded.tier,
            complete = excluded.complete,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN tier != excluded.tier OR complete != excluded.complete OR diary_name != excluded.diary_name
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run(accountHash, rsn ?? "", diaryId, diaryName, region, tier, complete, now, now, now);
}

function insertChange(
    insert: Database.Statement,
    accountHash: string,
    rsn: string | null,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    diaryId: string,
    diaryName: string,
    region: string,
    tierBefore: string | null,
    tierAfter: string,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "diary_change",
        diaryId,
        tierBefore ?? "",
        tierAfter,
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
        diaryId,
        diaryName,
        region,
        tierBefore,
        tierAfter,
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

export function handleDiaries(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const diaries: DiaryEntry[] = Array.isArray(payload.diaries) ? payload.diaries : [];
    const where = extractWhere(payload);
    const insertStmt = conn.prepare(
        `INSERT INTO plugin_diaries_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, diary_id, diary_name, diary_region, tier_before, tier_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        for (const d of diaries) {
            if (typeof d.region !== "string" || typeof d.tier !== "string") continue;
            const diaryId = deriveDiaryId(d.region, d.tier);
            const diaryName = deriveDiaryName(d.region, d.tier);
            const prior = readPriorTier(conn, accountHash, diaryId);
            if (prior !== null && prior !== d.tier) {
                insertChange(
                    insertStmt,
                    accountHash,
                    rsn,
                    envelope,
                    where,
                    diaryId,
                    diaryName,
                    d.region,
                    prior,
                    d.tier,
                );
            }
            upsertDiary(conn, accountHash, rsn, diaryId, diaryName, d.region, d.tier, d.complete ? 1 : 0, now);
        }
    })();
}

export function handleDiaryCompleted(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const region = typeof payload.region === "string" ? payload.region : null;
    const tier = typeof payload.tier === "string" ? payload.tier : null;
    if (region === null || tier === null) return;
    const diaryId = deriveDiaryId(region, tier);
    const diaryName = deriveDiaryName(region, tier);
    const where = extractWhere(payload);
    const insertStmt = conn.prepare(
        `INSERT INTO plugin_diaries_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, diary_id, diary_name, diary_region, tier_before, tier_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        const prior = readPriorTier(conn, accountHash, diaryId);
        insertChange(insertStmt, accountHash, rsn, envelope, where, diaryId, diaryName, region, prior, tier);
        upsertDiary(conn, accountHash, rsn, diaryId, diaryName, region, tier, 1, now);
    })();
}
