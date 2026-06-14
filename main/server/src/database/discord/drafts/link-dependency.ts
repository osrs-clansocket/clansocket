import { getDiscordGuildDb } from "../database-discord.js";

const INSERT_SQL = `INSERT INTO discord_draft_change_deps (
    guild_id, change_id, dependency_change_id, dependency_temp_id
) VALUES (?, ?, ?, ?)`;

export interface LinkDependencyInput {
    clanId: string;
    guildId: string;
    changeId: string;
    dependencyChangeId?: string | null;
    dependencyTempId?: string | null;
}

export function linkDependency(input: LinkDependencyInput): void {
    const db = getDiscordGuildDb(input.clanId, input.guildId);
    db.prepare(INSERT_SQL).run(
        input.guildId,
        input.changeId,
        input.dependencyChangeId ?? null,
        input.dependencyTempId ?? null,
    );
}
