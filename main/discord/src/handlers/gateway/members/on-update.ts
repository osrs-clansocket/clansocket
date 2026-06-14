import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractMemberRow } from "../../../state-sync/members/extract.js";
import { postMemberUpsert } from "../../../state-sync/members/post-upsert.js";

const TRIGGER_ID = "discord:members.updated";

export function wireMemberUpdateListener(client: Client): void {
    client.on(Events.GuildMemberUpdate, (_oldMember, newMember) => {
        if (newMember.partial) return;
        fire(TRIGGER_ID, {
            id: newMember.id,
            name: newMember.user.username,
            guildId: newMember.guild.id,
        });
        const row = extractMemberRow(newMember);
        void postMemberUpsert(newMember.guild.id, row);
    });
}
