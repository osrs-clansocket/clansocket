import type { Instance } from "../../../../factory";
import type { DiscordServer } from "../../../../../state/discord/client.js";
import { RAIL_ITEMS } from "./frame/rail-left.js";
import { buildChannelsMode } from "./modes/channels/mode.js";
import { buildEmojisMode } from "./modes/emojis-mode.js";
import { buildMembersMode } from "./modes/members/mode.js";
import { buildPlaceholderMode } from "./modes/placeholder-mode.js";
import { buildRolesMode } from "./modes/roles/mode.js";
import { buildByoBotMode } from "./modes/byo-bot/mode.js";
import { buildGuildSettingsMode } from "./modes/guild-settings/mode.js";
import { buildPermissionsMode } from "./modes/permissions/mode.js";
import { buildServerEmojisMode } from "./modes/server-emojis/mode.js";
import { buildServerStickersMode } from "./modes/server-stickers/mode.js";
import { buildAutoHooksMode } from "./modes/auto-hooks/mode.js";

export interface ModeContext {
    slug: string;
    server: DiscordServer;
    servers: readonly DiscordServer[];
}

type ModeBuilder = (ctx: ModeContext) => Instance;

const MODE_BUILDERS: Record<string, ModeBuilder> = {
    emojis: () => buildEmojisMode(),
    channels: (ctx) => buildChannelsMode(ctx.server),
    roles: (ctx) => buildRolesMode(ctx.server.guild_id),
    members: (ctx) => buildMembersMode(ctx.server.guild_id),
    "server-emojis": (ctx) => buildServerEmojisMode(ctx.server.guild_id),
    "server-stickers": (ctx) => buildServerStickersMode(ctx.server.guild_id),
    "server-settings": (ctx) => buildGuildSettingsMode(ctx.server.guild_id),
    permissions: (ctx) => buildPermissionsMode(ctx.server.guild_id),
    "byo-bot": (ctx) => buildByoBotMode(ctx.slug, ctx.server),
    "auto-hooks": (ctx) => buildAutoHooksMode(ctx.server.guild_id),
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
