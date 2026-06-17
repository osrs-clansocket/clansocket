import type { LiveSource } from "../../../dom/factory/live-ops";
import { openServerEmojisStream } from "../client.js";

export interface ServerEmojisFeed {
    readonly source: LiveSource;
}

export function createServerEmojisFeed(guildId: string): ServerEmojisFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openServerEmojisStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
