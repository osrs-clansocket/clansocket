import type { Client, Guild } from "discord.js";
import logger from "@clansocket/logger";
import { loadBotServers } from "../loaders/bot-servers-loader.js";
import { noServers } from "../shared/no-servers.js";
import type { BotIdentity } from "../shared/types/bot-types.js";
import { extractChannelRow } from "./channels/extract.js";
import { postChannelsBulkReplace } from "./channels/post-bulk-replace.js";
import { postServerFeatures } from "./features/post-features.js";
import { extractMemberRow } from "./members/extract.js";
import { postMembersBulkReplace } from "./members/post-bulk-replace.js";
import { extractRoleRow } from "./roles/extract.js";
import { postRolesBulkReplace } from "./roles/post-bulk-replace.js";
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

async function syncOneGuild(guildId: string, guild: Guild): Promise<void> {
    const channels: ChannelRow[] = [];
    for (const channel of guild.channels.cache.values()) {
        const row = extractChannelRow(channel);
        if (row) channels.push(row);
    }
    const roles = [...guild.roles.cache.values()].map(extractRoleRow);
    const members = await collectMembers(guild);
    await postChannelsBulkReplace(guildId, channels);
    await postRolesBulkReplace(guildId, roles);
    await postMembersBulkReplace(guildId, members);
    await postServerFeatures(guildId, [...guild.features]);
}

export async function syncChannelsAndRolesForAllGuilds(identity: BotIdentity, client: Client): Promise<void> {
    const servers = await loadBotServers(identity.bot_id);
    if (noServers(servers)) return;
    for (const server of servers) {
        const guild = client.guilds.cache.get(server.guild_id);
        if (!guild) continue;
        await syncOneGuild(server.guild_id, guild);
    }
    logger.info(`State synced for ${servers.length} guild(s) (bot=${identity.bot_id})`);
}
