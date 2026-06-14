import type { Instance } from "../../../../factory";
import type { DiscordServer } from "../../../../../state/discord/client.js";
import { RAIL_ITEMS } from "./frame/rail-left.js";
import { buildChannelsMode } from "./modes/channels/mode.js";
import { buildEmojisMode } from "./modes/emojis-mode.js";
import { buildPlaceholderMode } from "./modes/placeholder-mode.js";
import { buildRolesMode } from "./modes/roles/mode.js";
import { buildServerMode } from "./modes/server-mode.js";

export interface ModeContext {
    slug: string;
    server: DiscordServer;
    servers: readonly DiscordServer[];
}

type ModeBuilder = (ctx: ModeContext) => Instance;

const MODE_BUILDERS: Record<string, ModeBuilder> = {
    server: (ctx) => buildServerMode(ctx.slug, ctx.servers),
    emojis: () => buildEmojisMode(),
    channels: (ctx) => buildChannelsMode(ctx.server),
    roles: (ctx) => buildRolesMode(ctx.server.guild_id),
};

function labelForKey(key: string): string {
    for (const item of RAIL_ITEMS) {
        if (item.key === key) return item.label;
    }
    return key;
}

export function modeContent(ctx: ModeContext, key: string): Instance {
    const builder = MODE_BUILDERS[key];
    if (builder) return builder(ctx);
    return buildPlaceholderMode(labelForKey(key));
}
