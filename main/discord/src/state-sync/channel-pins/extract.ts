import type { Message } from "discord.js";
import type { ChannelPinRow } from "../types.js";

export function extractChannelPinRow(message: Message, guildId: string): ChannelPinRow {
    const attachments = [...message.attachments.values()].map((a) => a.url);
    return {
        message_id: message.id,
        channel_id: message.channelId,
        guild_id: guildId,
        author_user_id: message.author?.id ?? null,
        author_name: message.author?.username ?? null,
        content: message.content,
        timestamp: message.createdTimestamp,
        attachments,
    };
}
