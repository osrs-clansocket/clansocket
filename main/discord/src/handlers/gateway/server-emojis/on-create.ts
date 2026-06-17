import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractServerEmojiRow } from "../../../state-sync/server-emojis/extract.js";
import { postServerEmojiUpsert } from "../../../state-sync/server-emojis/post-upsert.js";

const TRIGGER_ID = "discord:server-emojis.created";

export function wireServerEmojiCreateListener(client: Client): void {
    client.on(Events.GuildEmojiCreate, (emoji) => {
        fire(TRIGGER_ID, {
            id: emoji.id,
            name: emoji.name,
            guildId: emoji.guild.id,
        });
        const row = extractServerEmojiRow(emoji);
        void postServerEmojiUpsert(emoji.guild.id, row);
    });
}
