import type { Client, Guild, PermissionOverwriteOptions } from "discord.js";
import { PermissionsBitField } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

const SUBJECT_PERMISSIONS = "permissions";

interface ChannelEditState {
    name?: string;
    topic?: string | null;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    parentId?: string | null;
}

interface ChannelPermissionsState {
    subject: typeof SUBJECT_PERMISSIONS;
    overwriteKind: "role" | "member";
    overwriteTargetId: string;
    allow: string;
    deny: string;
}

function bitfieldToBoolMap(allow: string, deny: string): PermissionOverwriteOptions {
    const opts: Record<string, boolean | null> = {};
    const allowBits = new PermissionsBitField(BigInt(allow));
    const denyBits = new PermissionsBitField(BigInt(deny));
    for (const flag of allowBits.toArray()) opts[flag] = true;
    for (const flag of denyBits.toArray()) opts[flag] = false;
    return opts as PermissionOverwriteOptions;
}

async function applyChannelEdit(guild: Guild, channelId: string, data: ChannelEditState): Promise<void> {
    const channel = await guild.channels.fetch(channelId);
    if (!channel) throw new Error(`channel ${channelId} not found`);
    await channel.edit({
        name: data.name,
        topic: data.topic ?? undefined,
        nsfw: data.nsfw,
        rateLimitPerUser: data.rateLimitPerUser,
        parent: data.parentId ?? undefined,
    });
}

async function applyPermissionOverwrite(guild: Guild, channelId: string, data: ChannelPermissionsState): Promise<void> {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || !("permissionOverwrites" in channel)) throw new Error(`channel ${channelId} not overwrite-capable`);
    const opts = bitfieldToBoolMap(data.allow, data.deny);
    await channel.permissionOverwrites.create(data.overwriteTargetId, opts);
}

export async function updateChannelHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("update requires after_json");
    const data = JSON.parse(row.after_json) as Record<string, unknown>;
    const guild = await client.guilds.fetch(row.guild_id);
    if (data.subject === SUBJECT_PERMISSIONS) {
        await applyPermissionOverwrite(guild, row.target_id_or_temp, data as unknown as ChannelPermissionsState);
    } else {
        await applyChannelEdit(guild, row.target_id_or_temp, data as ChannelEditState);
    }
    return { snowflakeResolved: null };
}
