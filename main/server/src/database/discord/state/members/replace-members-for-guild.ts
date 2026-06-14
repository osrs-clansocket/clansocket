import { getDiscordGuildDb } from "../../database-discord.js";
import type { MemberRow } from "../types.js";
import { upsertMember } from "./upsert-member.js";

const DELETE_ALL_SQL = `DELETE FROM discord_members WHERE guild_id = ?`;

export function replaceMembersForGuild(clanId: string, guildId: string, rows: MemberRow[]): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const tx = db.transaction(() => {
        db.prepare(DELETE_ALL_SQL).run(guildId);
        for (const row of rows) upsertMember(clanId, guildId, row);
    });
    tx();
}
