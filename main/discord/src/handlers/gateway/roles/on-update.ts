import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractRoleRow } from "../../../state-sync/roles/extract.js";
import { postRoleUpsert } from "../../../state-sync/roles/post-upsert.js";

const TRIGGER_ID = "discord:roles.updated";

export function wireRoleUpdateListener(client: Client): void {
    client.on(Events.GuildRoleUpdate, (_oldRole, newRole) => {
        fire(TRIGGER_ID, {
            id: newRole.id,
            name: newRole.name,
            guildId: newRole.guild.id,
            color: newRole.color,
        });
        void postRoleUpsert(newRole.guild.id, extractRoleRow(newRole));
    });
}
