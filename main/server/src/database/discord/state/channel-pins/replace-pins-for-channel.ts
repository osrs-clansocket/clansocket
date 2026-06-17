import { getDiscordGuildDb } from "../../database-discord.js";
import type { ChannelPinRow } from "../types.js";
import { upsertChannelPin } from "./upsert-channel-pin.js";

const DELETE_BY_CHANNEL_SQL = `DELETE FROM discord_channel_pins WHERE channel_id = ?`;

export function replacePinsForChannel(
    clanId: string,
    guildId: string,
    channelId: string,
    rows: readonly ChannelPinRow[],
): void {
    const db = getDiscordGuildDb(clanId, guildId);
    const tx = db.transaction(() => {
        db.prepare(DELETE_BY_CHANNEL_SQL).run(channelId);
        for (const row of rows) upsertChannelPin(clanId, guildId, row);
    });
    tx();
}
