import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelOverwriteRow } from "../types.js";
import { upsertMemberOverwrite } from "./upsert-member-overwrite.js";
import { upsertRoleOverwrite } from "./upsert-role-overwrite.js";

const DELETE_ROLES_FOR_CHANNEL_SQL = `DELETE FROM discord_channel_role_overwrites WHERE channel_id = ?`;
const DELETE_MEMBERS_FOR_CHANNEL_SQL = `DELETE FROM discord_channel_member_overwrites WHERE channel_id = ?`;

export function replaceOverwritesForChannel(
    clanId: string,
    guildId: string,
    channelId: string,
    rows: readonly ChannelOverwriteRow[],
): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const tx = db.transaction(() => {
        db.prepare(DELETE_ROLES_FOR_CHANNEL_SQL).run(channelId);
        db.prepare(DELETE_MEMBERS_FOR_CHANNEL_SQL).run(channelId);
        for (const row of rows) {
            if (row.kind === "role") upsertRoleOverwrite(clanId, guildId, row);
            else upsertMemberOverwrite(clanId, guildId, row);
        }
    });
    tx();
}
