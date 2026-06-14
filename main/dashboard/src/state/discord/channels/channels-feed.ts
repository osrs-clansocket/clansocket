import type { LiveSource } from "../../../dom/factory/live-ops";
import { openChannelsStream } from "../client.js";

export interface ChannelsFeed {
    readonly source: LiveSource;
}

export function createChannelsFeed(guildId: string): ChannelsFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openChannelsStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
