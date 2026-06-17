import type { LiveSource } from "../../../dom/factory/live-ops";
import { openGuildSettingsStream } from "../client.js";

export interface GuildSettingsFeed {
    readonly source: LiveSource;
}

export function createGuildSettingsFeed(guildId: string): GuildSettingsFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openGuildSettingsStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
