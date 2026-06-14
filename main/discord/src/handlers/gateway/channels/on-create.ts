import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractChannelRow } from "../../../state-sync/channels/extract.js";
import { postChannelUpsert } from "../../../state-sync/channels/post-upsert.js";

const TRIGGER_ID = "discord:channels.created";

export function wireChannelCreateListener(client: Client): void {
    client.on(Events.ChannelCreate, (channel) => {
        if (!("guild" in channel) || !channel.guild) return;
        fire(TRIGGER_ID, {
            id: channel.id,
            name: channel.name,
            guildId: channel.guild.id,
            type: channel.type,
        });
        const row = extractChannelRow(channel);
        if (row) void postChannelUpsert(channel.guild.id, row);
    });
}
