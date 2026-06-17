import { PermissionsBitField, type Client, type Guild } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";
import { validateBotPermission } from "../../../validators/bot-permission.js";

const SUBJECT_KICK = "kick";
const SUBJECT_BAN = "ban";

interface KickState {
    subject: typeof SUBJECT_KICK;
    targetUserId: string;
    reason: string | null;
}

interface BanState {
    subject: typeof SUBJECT_BAN;
    targetUserId: string;
    reason: string | null;
    deleteMessageDays: number | null;
}

type DeleteState = KickState | BanState;

const SECONDS_PER_DAY = 86400;

async function ensurePermission(client: Client, guildId: string, perm: bigint): Promise<void> {
    const ok = await validateBotPermission({ client, guildId, requiredPermission: perm });
    if (!ok) throw new Error(`bot_permission_denied: ${String(perm)}`);
}

async function applyKick(client: Client, guild: Guild, data: KickState): Promise<void> {
    await ensurePermission(client, guild.id, PermissionsBitField.Flags.KickMembers);
    const member = await guild.members.fetch(data.targetUserId);
    await member.kick(data.reason ?? undefined);
}

async function applyBan(client: Client, guild: Guild, data: BanState): Promise<void> {
    await ensurePermission(client, guild.id, PermissionsBitField.Flags.BanMembers);
    const deleteMessageSeconds = data.deleteMessageDays === null ? undefined : data.deleteMessageDays * SECONDS_PER_DAY;
    await guild.bans.create(data.targetUserId, {
        reason: data.reason ?? undefined,
        deleteMessageSeconds,
    });
}

export async function deleteMemberHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("delete requires after_json");
    const data = JSON.parse(row.after_json) as DeleteState;
    const guild = await client.guilds.fetch(row.guild_id);
    switch (data.subject) {
        case SUBJECT_KICK:
            await applyKick(client, guild, data);
            break;
        case SUBJECT_BAN:
            await applyBan(client, guild, data);
            break;
        default:
            throw new Error(`unsupported delete subject: ${(data as { subject: string }).subject}`);
    }
    return { snowflakeResolved: null };
}
