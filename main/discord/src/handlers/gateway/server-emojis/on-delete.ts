import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { postServerEmojiDelete } from "../../../state-sync/server-emojis/post-delete.js";

const TRIGGER_ID = "discord:server-emojis.deleted";

export function wireServerEmojiDeleteListener(client: Client): void {
    client.on(Events.GuildEmojiDelete, (emoji) => {
        fire(TRIGGER_ID, {
            id: emoji.id,
            name: emoji.name,
            guildId: emoji.guild.id,
        });
        void postServerEmojiDelete(emoji.guild.id, emoji.id);
    });
}
