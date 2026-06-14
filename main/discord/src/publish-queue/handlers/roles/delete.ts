import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

export async function deleteRoleHandler(client: Client, row: PendingPublishRow): Promise<{ snowflakeResolved: null }> {
    const guild = await client.guilds.fetch(row.guild_id);
    const role = await guild.roles.fetch(row.target_id_or_temp);
    if (!role) throw new Error(`role ${row.target_id_or_temp} not found`);
    await role.delete();
    return { snowflakeResolved: null };
}
