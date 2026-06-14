import type { DiscordRole, DiscordRoleState } from "../../client.js";

export function roleStateOf(r: DiscordRole): DiscordRoleState {
    return {
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        mentionable: r.mentionable,
        permissions: r.permissions,
    };
}
