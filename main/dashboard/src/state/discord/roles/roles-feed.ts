import type { LiveSource } from "../../../dom/factory/live-ops";
import { openRolesStream } from "../client.js";

export interface RolesFeed {
    readonly source: LiveSource;
}

export function createRolesFeed(guildId: string): RolesFeed {
    return {
        source: {
            subscribe(onSnapshot, onDelta): () => void {
                return openRolesStream(guildId, onSnapshot, onDelta);
            },
        },
    };
}
