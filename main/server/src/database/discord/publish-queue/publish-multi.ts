import { randomUUID } from "node:crypto";
import { getDiscordGuildDb } from "../database-discord.js";
import { sortChangesByDeps, type DependencyEdge } from "./sort-changes.js";

const SELECT_CHANGES_SQL = `SELECT change_id FROM discord_draft_changes
    WHERE session_id = ? ORDER BY sequence_no ASC`;
const SELECT_DEPS_SQL = `SELECT change_id, dependency_change_id
    FROM discord_draft_change_deps
    WHERE dependency_change_id IS NOT NULL
      AND change_id IN (SELECT change_id FROM discord_draft_changes WHERE session_id = ?)`;
const INSERT_QUEUE_SQL = `INSERT INTO discord_draft_publish_queue (
    queue_id, guild_id, session_id, op_id, status, attempt_no, created_at, updated_at
) VALUES ($queueId, $guildId, $sessionId, $opId, $status, $attemptNo, $now, $now)`;

const STATUS_PENDING = "pending";
const INITIAL_ATTEMPT = 0;

export interface PublishMultiOpDraftInput {
    clanId: string;
    guildId: string;
    sessionId: string;
}

export function publishMultiOpDraft(input: PublishMultiOpDraftInput): string[] {
    const db = getDiscordGuildDb(input.clanId, input.guildId);
    const changes = db.prepare(SELECT_CHANGES_SQL).all(input.sessionId) as { change_id: string }[];
    const deps = db.prepare(SELECT_DEPS_SQL).all(input.sessionId) as DependencyEdge[];
    const sortedIds = sortChangesByDeps(
        changes.map((c) => c.change_id),
        deps,
    );
    const now = Date.now();
    const queueIds: string[] = [];
    const insert = db.prepare(INSERT_QUEUE_SQL);
    const tx = db.transaction(() => {
        for (const changeId of sortedIds) {
            const queueId = randomUUID();
            insert.run({
                queueId,
                guildId: input.guildId,
                sessionId: input.sessionId,
                opId: changeId,
                status: STATUS_PENDING,
                attemptNo: INITIAL_ATTEMPT,
                now,
            });
            queueIds.push(queueId);
        }
    });
    tx();
    return queueIds;
}
