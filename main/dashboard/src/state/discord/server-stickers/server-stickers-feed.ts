import type { LiveSource } from "../../../dom/factory/live-ops";
import { openServerStickersStream } from "../client.js";

export interface ServerStickersFeed {
    readonly source: LiveSource;
}

export function createServerStickersFeed(guildId: string): ServerStickersFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openServerStickersStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
