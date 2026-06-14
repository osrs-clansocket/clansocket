import { getDiscordGuildDb } from "../database-discord.js";

const SELECT_SIBLINGS_SQL = `SELECT queue.queue_id, queue.resolved_dependencies_json
    FROM discord_draft_publish_queue queue
    JOIN discord_draft_change_deps deps ON deps.change_id = queue.op_id
    WHERE queue.session_id = ? AND deps.dependency_temp_id = ?
      AND queue.status IN ('pending', 'in_flight')`;

const UPDATE_RESOLVED_SQL = `UPDATE discord_draft_publish_queue
    SET resolved_dependencies_json = ?
    WHERE queue_id = ?`;

export interface ResolveDependencyInput {
    clanId: string;
    guildId: string;
    sessionId: string;
    tempId: string;
    snowflake: string;
}

interface SiblingRow {
    queue_id: string;
    resolved_dependencies_json: string | null;
}

function mergeResolved(existing: string | null, tempId: string, snowflake: string): string {
    const map = existing ? (JSON.parse(existing) as Record<string, string>) : {};
    map[tempId] = snowflake;
    return JSON.stringify(map);
}

export function resolveDependency(input: ResolveDependencyInput): number {
    const db = getDiscordGuildDb(input.clanId, input.guildId);
    const siblings = db.prepare(SELECT_SIBLINGS_SQL).all(input.sessionId, input.tempId) as SiblingRow[];
    if (siblings.length === 0) return 0;
    const update = db.prepare(UPDATE_RESOLVED_SQL);
    const tx = db.transaction(() => {
        for (const sib of siblings) {
            update.run(mergeResolved(sib.resolved_dependencies_json, input.tempId, input.snowflake), sib.queue_id);
        }
    });
    tx();
    return siblings.length;
}
