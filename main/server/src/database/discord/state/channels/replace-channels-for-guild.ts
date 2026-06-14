import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelRow } from "../types.js";

const DELETE_BY_GUILD_SQL = `DELETE FROM discord_channels WHERE guild_id = ?`;
const INSERT_SQL = `
INSERT INTO discord_channels (channel_id, guild_id, name, type, parent_id, position, topic, nsfw, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const NSFW_TRUE = 1;
const NSFW_FALSE = 0;

export function replaceChannelsForGuild(clanId: string, guildId: string, channels: readonly ChannelRow[]): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const now = Date.now();
    const insertStmt = db.prepare(INSERT_SQL);
    const deleteStmt = db.prepare(DELETE_BY_GUILD_SQL);
    const tx = db.transaction(() => {
        deleteStmt.run(guildId);
        for (const c of channels) {
            insertStmt.run(
                c.channel_id,
                c.guild_id,
                c.name,
                c.type,
                c.parent_id,
                c.position,
                c.topic,
                c.nsfw ? NSFW_TRUE : NSFW_FALSE,
                now,
            );
        }
    });
    tx();
}
