import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

interface QuestEntry {
    id: number;
    name?: string;
    state?: string;
}

function readPriorState(conn: Database.Database, accountHash: string, questId: number): string | null {
    const row = conn
        .prepare("SELECT state FROM plugin_quests WHERE account_hash = ? AND quest_id = ?")
        .get(accountHash, questId) as { state: string } | undefined;
    return row?.state ?? null;
}

function upsertQuest(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    questId: number,
    questName: string,
    state: string,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_quests (account_hash, rsn, quest_id, quest_name, state, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, quest_id) DO UPDATE SET
            rsn = excluded.rsn,
            quest_name = excluded.quest_name,
            state = excluded.state,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN state != excluded.state OR quest_name != excluded.quest_name
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run(accountHash, rsn ?? "", questId, questName, state, now, now, now);
}

function insertChange(
    insert: Database.Statement,
    accountHash: string,
    rsn: string | null,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    questId: number,
    questName: string,
    stateBefore: string,
    stateAfter: string,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "quest_change",
        questId,
        stateBefore,
        stateAfter,
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
        questId,
        questName,
        stateBefore,
        stateAfter,
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

export function handleQuests(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const quests: QuestEntry[] = Array.isArray(payload.quests) ? payload.quests : [];
    const where = extractWhere(payload);
    const insertStmt = conn.prepare(
        `INSERT INTO plugin_quests_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, quest_id, quest_name, state_before, state_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        for (const q of quests) {
            if (typeof q.id !== "number" || typeof q.state !== "string") continue;
            const name = typeof q.name === "string" ? q.name : "";
            const prior = readPriorState(conn, accountHash, q.id);
            if (prior !== null && prior !== q.state) {
                insertChange(insertStmt, accountHash, rsn, envelope, where, q.id, name, prior, q.state);
            }
            upsertQuest(conn, accountHash, rsn, q.id, name, q.state, now);
        }
    })();
}

export function handleQuestCompleted(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const questId = typeof payload.id === "number" ? payload.id : null;
    const questName = typeof payload.name === "string" ? payload.name : "";
    if (questId === null) return;
    const where = extractWhere(payload);
    const insertStmt = conn.prepare(
        `INSERT INTO plugin_quests_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, quest_id, quest_name, state_before, state_after,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        const prior = readPriorState(conn, accountHash, questId) ?? "IN_PROGRESS";
        insertChange(insertStmt, accountHash, rsn, envelope, where, questId, questName, prior, "COMPLETE");
        upsertQuest(conn, accountHash, rsn, questId, questName, "COMPLETE", now);
    })();
}
