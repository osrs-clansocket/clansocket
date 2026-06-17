import type { Client, Guild } from "discord.js";
import logger from "@clansocket/logger";
import { loadBotServers } from "../loaders/bot-servers-loader.js";
import { noServers } from "../shared/no-servers.js";
import type { BotIdentity } from "../shared/types/bot-types.js";
import { extractChannelRow } from "./channels/extract.js";
import { postChannelsBulkReplace } from "./channels/post-bulk-replace.js";
import { extractChannelOverwrites } from "./channel-overwrites/extract.js";
import { postChannelOverwritesChannelReplace } from "./channel-overwrites/post-channel-replace.js";
import { extractChannelPinRow } from "./channel-pins/extract.js";
import { postChannelPinsReplace } from "./channel-pins/post-channel-replace.js";
import { postServerFeatures } from "./features/post-features.js";
import { extractMemberRow } from "./members/extract.js";
import { postMembersBulkReplace } from "./members/post-bulk-replace.js";
import { extractRoleRow } from "./roles/extract.js";
import { postRolesBulkReplace } from "./roles/post-bulk-replace.js";
import { extractGuildSettingsRow } from "./guild-settings/extract.js";
import { postGuildSettingsUpsert } from "./guild-settings/post-upsert.js";
import { extractServerEmojiRow } from "./server-emojis/extract.js";
import { postServerEmojisBulkReplace } from "./server-emojis/post-bulk-replace.js";
import { extractServerStickerRow } from "./server-stickers/extract.js";
import { postServerStickersBulkReplace } from "./server-stickers/post-bulk-replace.js";
import { extractWebhookRow } from "./webhooks/extract.js";
import { extractWebhookTokenIfAvailable, type WebhookTokenSync } from "./webhooks/extract-token.js";
import { postWebhooksChannelReplace } from "./webhooks/post-channel-replace.js";
import { isWebhookCapable, type WebhookCapableChannel } from "./webhooks/webhook-capable-guard.js";
import type { ChannelRow, MemberRow } from "./types.js";

async function collectMembers(guild: Guild): Promise<MemberRow[]> {
    try {
        const members = await guild.members.fetch();
        return [...members.values()].map(extractMemberRow);
    } catch (err) {
        logger.warn(`members fetch failed for guild ${guild.id}: ${(err as Error).message}`);
        return [];
    }
}

async function syncWebhooksForChannel(guildId: string, channel: WebhookCapableChannel, botId: string): Promise<void> {
    try {
        const collection = await channel.fetchWebhooks();
        const list = [...collection.values()];
        const rows = list.map(extractWebhookRow);
        const tokens: WebhookTokenSync[] = [];
        for (const wh of list) {
            const sync = extractWebhookTokenIfAvailable(wh, channel.name ?? null, botId);
            if (sync !== null) tokens.push(sync);
        }
        await postWebhooksChannelReplace(guildId, channel.id, rows, tokens);
    } catch (err) {
        logger.warn(`webhooks fetch failed for channel ${channel.id}: ${(err as Error).message}`);
    }
}

export async function syncOneGuild(guildId: string, guild: Guild, botId: string): Promise<void> {
    const channelsById = new Map<string, ChannelRow>();
    for (const channel of guild.channels.cache.values()) {
        const row = extractChannelRow(channel);
        if (row) channelsById.set(row.channel_id, row);
    }
    try {
        const active = await guild.channels.fetchActiveThreads();
        for (const thread of active.threads.values()) {
            const row = extractChannelRow(thread);
            if (row) channelsById.set(row.channel_id, row);
        }
    } catch (err) {
        logger.warn(`active threads fetch failed for guild ${guildId}: ${(err as Error).message}`);
    }
    for (const channel of guild.channels.cache.values()) {
        if (!("threads" in channel) || channel.threads === undefined) continue;
        try {
            const archived = await channel.threads.fetchArchived();
            for (const thread of archived.threads.values()) {
                const row = extractChannelRow(thread);
                if (row) channelsById.set(row.channel_id, row);
            }
        } catch (err) {
            logger.warn(`archived threads fetch failed for channel ${channel.id}: ${(err as Error).message}`);
        }
    }
    const channels = [...channelsById.values()];
    const roles = [...guild.roles.cache.values()].map(extractRoleRow);
    const members = await collectMembers(guild);
    await postChannelsBulkReplace(guildId, channels);
    await postRolesBulkReplace(guildId, roles);
    await postMembersBulkReplace(guildId, members);
    await postServerFeatures(guildId, [...guild.features]);
    for (const channel of guild.channels.cache.values()) {
        if (isWebhookCapable(channel)) await syncWebhooksForChannel(guildId, channel, botId);
    }
    const serverEmojis = [...guild.emojis.cache.values()].map(extractServerEmojiRow);
    await postServerEmojisBulkReplace(guildId, serverEmojis);
    const serverStickers = [...guild.stickers.cache.values()].map(extractServerStickerRow);
    await postServerStickersBulkReplace(guildId, serverStickers);
    const settings = await extractGuildSettingsRow(guild);
    await postGuildSettingsUpsert(guildId, settings);
    for (const channel of guild.channels.cache.values()) {
        const overwrites = extractChannelOverwrites(channel);
        if (overwrites.length > 0) {
            await postChannelOverwritesChannelReplace(guildId, channel.id, overwrites);
        }
    }
    for (const channel of guild.channels.cache.values()) {
        if (!("messages" in channel) || channel.messages === undefined) continue;
        try {
            const pinned = await channel.messages.fetchPins();
            const rows = pinned.items.map((item) => extractChannelPinRow(item.message, guildId));
            await postChannelPinsReplace(guildId, channel.id, rows);
        } catch (err) {
            logger.warn(`pins fetch failed for channel ${channel.id}: ${(err as Error).message}`);
        }
    }
}

export async function syncChannelsAndRolesForAllGuilds(identity: BotIdentity, client: Client): Promise<void> {
    const servers = await loadBotServers(identity.bot_id);
    if (noServers(servers)) return;
    for (const server of servers) {
        const guild = client.guilds.cache.get(server.guild_id);
        if (!guild) continue;
        await syncOneGuild(server.guild_id, guild, identity.bot_id);
    }
    logger.info(`State synced for ${servers.length} guild(s) (bot=${identity.bot_id})`);
}
