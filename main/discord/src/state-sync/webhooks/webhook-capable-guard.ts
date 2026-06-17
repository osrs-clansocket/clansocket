import {
    ChannelType,
    type ForumChannel,
    type GuildBasedChannel,
    type MediaChannel,
    type NewsChannel,
    type StageChannel,
    type TextChannel,
    type VoiceChannel,
} from "discord.js";

export type WebhookCapableChannel =
    | TextChannel
    | NewsChannel
    | VoiceChannel
    | StageChannel
    | ForumChannel
    | MediaChannel;

export function isWebhookCapable(channel: GuildBasedChannel | null | undefined): channel is WebhookCapableChannel {
    if (!channel) return false;
    return (
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement ||
        channel.type === ChannelType.GuildVoice ||
        channel.type === ChannelType.GuildStageVoice ||
        channel.type === ChannelType.GuildForum ||
        channel.type === ChannelType.GuildMedia
    );
}
