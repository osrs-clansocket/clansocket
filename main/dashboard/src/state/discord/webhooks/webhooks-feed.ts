import type { LiveSource } from "../../../dom/factory/live-ops";
import { openWebhooksStream } from "../client.js";

export interface WebhooksFeed {
    readonly source: LiveSource;
}

export function createWebhooksFeed(guildId: string): WebhooksFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openWebhooksStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
