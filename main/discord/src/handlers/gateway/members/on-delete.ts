import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { postMemberDelete } from "../../../state-sync/members/post-delete.js";

const TRIGGER_ID = "discord:members.left";

export function wireMemberDeleteListener(client: Client): void {
    client.on(Events.GuildMemberRemove, (member) => {
        fire(TRIGGER_ID, {
            id: member.id,
            name: member.user.username,
            guildId: member.guild.id,
        });
        void postMemberDelete(member.guild.id, member.id);
    });
}
