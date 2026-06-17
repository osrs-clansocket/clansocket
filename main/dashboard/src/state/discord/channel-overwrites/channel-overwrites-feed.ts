import type { LiveSource } from "../../../dom/factory/live-ops";
import { openChannelOverwritesStream } from "../client.js";

export interface ChannelOverwritesFeed {
    readonly source: LiveSource;
}

export function createChannelOverwritesFeed(guildId: string): ChannelOverwritesFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openChannelOverwritesStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
