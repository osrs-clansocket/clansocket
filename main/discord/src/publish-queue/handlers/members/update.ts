import { PermissionsBitField, type Client, type Guild } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";
import { validateBotPermission } from "../../../validators/bot-permission.js";

const SUBJECT_NICKNAME = "nickname";
const SUBJECT_ADD_ROLE = "add-role";
const SUBJECT_REMOVE_ROLE = "remove-role";
const SUBJECT_TIMEOUT = "timeout";

interface NicknameState {
    subject: typeof SUBJECT_NICKNAME;
    targetUserId: string;
    nickname: string | null;
}

interface AddRoleState {
    subject: typeof SUBJECT_ADD_ROLE;
    targetUserId: string;
    roleId: string;
}

interface RemoveRoleState {
    subject: typeof SUBJECT_REMOVE_ROLE;
    targetUserId: string;
    roleId: string;
}

interface TimeoutState {
    subject: typeof SUBJECT_TIMEOUT;
    targetUserId: string;
    communicationDisabledUntil: number | null;
    reason: string | null;
}

type UpdateState = NicknameState | AddRoleState | RemoveRoleState | TimeoutState;

async function ensurePermission(client: Client, guildId: string, perm: bigint): Promise<void> {
    const ok = await validateBotPermission({ client, guildId, requiredPermission: perm });
    if (!ok) throw new Error(`bot_permission_denied: ${String(perm)}`);
}

async function applyNickname(client: Client, guild: Guild, data: NicknameState): Promise<void> {
    await ensurePermission(client, guild.id, PermissionsBitField.Flags.ManageNicknames);
    const member = await guild.members.fetch(data.targetUserId);
    await member.setNickname(data.nickname);
}

async function applyAddRole(client: Client, guild: Guild, data: AddRoleState): Promise<void> {
    await ensurePermission(client, guild.id, PermissionsBitField.Flags.ManageRoles);
    const member = await guild.members.fetch(data.targetUserId);
    await member.roles.add(data.roleId);
}

async function applyRemoveRole(client: Client, guild: Guild, data: RemoveRoleState): Promise<void> {
    await ensurePermission(client, guild.id, PermissionsBitField.Flags.ManageRoles);
    const member = await guild.members.fetch(data.targetUserId);
    await member.roles.remove(data.roleId);
}

async function applyTimeout(client: Client, guild: Guild, data: TimeoutState): Promise<void> {
    await ensurePermission(client, guild.id, PermissionsBitField.Flags.ModerateMembers);
    const member = await guild.members.fetch(data.targetUserId);
    const until = data.communicationDisabledUntil;
    const duration = until === null ? null : Math.max(0, until - Date.now());
    await member.timeout(duration, data.reason ?? undefined);
}

export async function updateMemberHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("update requires after_json");
    const data = JSON.parse(row.after_json) as UpdateState;
    const guild = await client.guilds.fetch(row.guild_id);
    switch (data.subject) {
        case SUBJECT_NICKNAME:
            await applyNickname(client, guild, data);
            break;
        case SUBJECT_ADD_ROLE:
            await applyAddRole(client, guild, data);
            break;
        case SUBJECT_REMOVE_ROLE:
            await applyRemoveRole(client, guild, data);
            break;
        case SUBJECT_TIMEOUT:
            await applyTimeout(client, guild, data);
            break;
        default:
            throw new Error(`unsupported update subject: ${(data as { subject: string }).subject}`);
    }
    return { snowflakeResolved: null };
}
