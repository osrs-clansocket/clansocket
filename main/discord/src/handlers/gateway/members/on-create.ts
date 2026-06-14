import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractMemberRow } from "../../../state-sync/members/extract.js";
import { postMemberUpsert } from "../../../state-sync/members/post-upsert.js";

const TRIGGER_ID = "discord:members.joined";

export function wireMemberCreateListener(client: Client): void {
    client.on(Events.GuildMemberAdd, (member) => {
        fire(TRIGGER_ID, {
            id: member.id,
            name: member.user.username,
            guildId: member.guild.id,
        });
        const row = extractMemberRow(member);
        void postMemberUpsert(member.guild.id, row);
    });
}
