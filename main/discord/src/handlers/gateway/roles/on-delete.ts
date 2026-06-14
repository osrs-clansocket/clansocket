import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { postRoleDelete } from "../../../state-sync/roles/post-delete.js";

const TRIGGER_ID = "discord:roles.deleted";

export function wireRoleDeleteListener(client: Client): void {
    client.on(Events.GuildRoleDelete, (role) => {
        fire(TRIGGER_ID, {
            id: role.id,
            name: role.name,
            guildId: role.guild.id,
        });
        void postRoleDelete(role.guild.id, role.id);
    });
}
