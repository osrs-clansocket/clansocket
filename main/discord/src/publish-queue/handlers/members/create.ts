import { PermissionsBitField, type Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";
import { validateBotPermission } from "../../../validators/bot-permission.js";

const SUBJECT_UNBAN = "unban";

interface UnbanState {
    subject: typeof SUBJECT_UNBAN;
    targetUserId: string;
    reason: string | null;
}

async function ensurePermission(client: Client, guildId: string, perm: bigint): Promise<void> {
    const ok = await validateBotPermission({ client, guildId, requiredPermission: perm });
    if (!ok) throw new Error(`bot_permission_denied: ${String(perm)}`);
}

export async function createMemberHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("create requires after_json");
    const data = JSON.parse(row.after_json) as UnbanState;
    if (data.subject !== SUBJECT_UNBAN) throw new Error(`unsupported create subject: ${data.subject}`);
    await ensurePermission(client, row.guild_id, PermissionsBitField.Flags.BanMembers);
    const guild = await client.guilds.fetch(row.guild_id);
    await guild.bans.remove(data.targetUserId, data.reason ?? undefined);
    return { snowflakeResolved: null };
}
