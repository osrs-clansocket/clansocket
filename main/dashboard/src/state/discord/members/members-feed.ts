import type { LiveSource } from "../../../dom/factory/live-ops";
import { openMembersStream } from "../client.js";

export interface MembersFeed {
    readonly source: LiveSource;
}

export function createMembersFeed(guildId: string): MembersFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openMembersStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
