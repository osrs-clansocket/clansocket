import { getDiscordGuildDb } from "../database-discord.js";

const SELECT_SQL = `SELECT auto_hook_id, auto_hook_name, guild_id, trigger_type, webhook_id,
    content_template, use_embed, embed_template_json, conditions_json, enabled,
    webhook_username_override, webhook_avatar_url_override,
    created_by_account_id, created_by_account_name, created_at, updated_at
FROM discord_auto_hooks
WHERE guild_id = ?
ORDER BY created_at DESC`;

export interface AutoHookRow {
    auto_hook_id: string;
    auto_hook_name: string;
    guild_id: string;
    trigger_type: string;
    webhook_id: string;
    content_template: string | null;
    use_embed: number;
    embed_template_json: string | null;
    conditions_json: string | null;
    enabled: number;
    webhook_username_override: string | null;
    webhook_avatar_url_override: string | null;
    created_by_account_id: string;
    created_by_account_name: string | null;
    created_at: number;
    updated_at: number;
}

export function listAutoHooks(clanId: string, guildId: string): AutoHookRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    return db.prepare(SELECT_SQL).all(guildId) as AutoHookRow[];
}
