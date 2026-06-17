import { Events, type Client } from "discord.js";
import { fire } from "../../../flow-api/trigger-bus.js";
import { extractServerEmojiRow } from "../../../state-sync/server-emojis/extract.js";
import { postServerEmojiUpsert } from "../../../state-sync/server-emojis/post-upsert.js";

const TRIGGER_ID = "discord:server-emojis.updated";

export function wireServerEmojiUpdateListener(client: Client): void {
    client.on(Events.GuildEmojiUpdate, (_oldEmoji, newEmoji) => {
        fire(TRIGGER_ID, {
            id: newEmoji.id,
            name: newEmoji.name,
            guildId: newEmoji.guild.id,
        });
        const row = extractServerEmojiRow(newEmoji);
        void postServerEmojiUpsert(newEmoji.guild.id, row);
    });
}
