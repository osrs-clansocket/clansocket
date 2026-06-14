import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { postChannelDelete } from "../../../state-sync/channels/post-delete.js";

const TRIGGER_ID = "discord:channels.deleted";

export function wireChannelDeleteListener(client: Client): void {
    client.on(Events.ChannelDelete, (channel) => {
        if (!("guild" in channel) || !channel.guild) return;
        fire(TRIGGER_ID, {
            id: channel.id,
            name: channel.name,
            guildId: channel.guild.id,
            type: channel.type,
        });
        void postChannelDelete(channel.guild.id, channel.id);
    });
}
