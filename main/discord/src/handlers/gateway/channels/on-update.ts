import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractChannelRow } from "../../../state-sync/channels/extract.js";
import { postChannelUpsert } from "../../../state-sync/channels/post-upsert.js";

const TRIGGER_ID = "discord:channels.updated";

export function wireChannelUpdateListener(client: Client): void {
    client.on(Events.ChannelUpdate, (_oldChannel, newChannel) => {
        if (!("guild" in newChannel) || !newChannel.guild) return;
        fire(TRIGGER_ID, {
            id: newChannel.id,
            name: newChannel.name,
            guildId: newChannel.guild.id,
            type: newChannel.type,
        });
        const row = extractChannelRow(newChannel);
        if (row) void postChannelUpsert(newChannel.guild.id, row);
    });
}
