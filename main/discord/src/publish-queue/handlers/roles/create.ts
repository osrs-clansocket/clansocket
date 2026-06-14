import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

interface RoleCreateState {
    name: string;
    color: number;
    hoist: boolean;
    mentionable: boolean;
    permissions: string;
}

export async function createRoleHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: string }> {
    if (!row.after_json) throw new Error("create requires after_json");
    const data = JSON.parse(row.after_json) as RoleCreateState;
    const guild = await client.guilds.fetch(row.guild_id);
    const role = await guild.roles.create({
        name: data.name,
        color: data.color,
        hoist: data.hoist,
        mentionable: data.mentionable,
        permissions: BigInt(data.permissions),
    });
    return { snowflakeResolved: role.id };
}
