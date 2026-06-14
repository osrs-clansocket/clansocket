import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractRoleRow } from "../../../state-sync/roles/extract.js";
import { postRoleUpsert } from "../../../state-sync/roles/post-upsert.js";

const TRIGGER_ID = "discord:roles.created";

export function wireRoleCreateListener(client: Client): void {
    client.on(Events.GuildRoleCreate, (role) => {
        fire(TRIGGER_ID, {
            id: role.id,
            name: role.name,
            guildId: role.guild.id,
            color: role.color,
        });
        void postRoleUpsert(role.guild.id, extractRoleRow(role));
    });
}
