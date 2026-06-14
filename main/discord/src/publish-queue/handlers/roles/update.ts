import type { Client, Guild } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

const SUBJECT_POSITION = "position";
const SUBJECT_PERMISSIONS = "permissions";

interface RoleEditState {
    name?: string;
    color?: number;
    hoist?: boolean;
    mentionable?: boolean;
    permissions?: string;
}

interface RolePositionState {
    subject: typeof SUBJECT_POSITION;
    position: number;
}

interface RolePermissionsState {
    subject: typeof SUBJECT_PERMISSIONS;
    permissions: string;
}

async function fetchRole(guild: Guild, roleId: string) {
    const role = await guild.roles.fetch(roleId);
    if (!role) throw new Error(`role ${roleId} not found`);
    return role;
}

async function applyRoleEdit(guild: Guild, roleId: string, data: RoleEditState): Promise<void> {
    const role = await fetchRole(guild, roleId);
    await role.edit({
        name: data.name,
        color: data.color,
        hoist: data.hoist,
        mentionable: data.mentionable,
        permissions: data.permissions === undefined ? undefined : BigInt(data.permissions),
    });
}

async function applyRolePosition(guild: Guild, roleId: string, data: RolePositionState): Promise<void> {
    const role = await fetchRole(guild, roleId);
    await role.setPosition(data.position);
}

async function applyRolePermissions(guild: Guild, roleId: string, data: RolePermissionsState): Promise<void> {
    const role = await fetchRole(guild, roleId);
    await role.setPermissions(BigInt(data.permissions));
}

export async function updateRoleHandler(client: Client, row: PendingPublishRow): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("update requires after_json");
    const data = JSON.parse(row.after_json) as Record<string, unknown>;
    const guild = await client.guilds.fetch(row.guild_id);
    if (data.subject === SUBJECT_POSITION) {
        await applyRolePosition(guild, row.target_id_or_temp, data as unknown as RolePositionState);
    } else if (data.subject === SUBJECT_PERMISSIONS) {
        await applyRolePermissions(guild, row.target_id_or_temp, data as unknown as RolePermissionsState);
    } else {
        await applyRoleEdit(guild, row.target_id_or_temp, data as RoleEditState);
    }
    return { snowflakeResolved: null };
}
