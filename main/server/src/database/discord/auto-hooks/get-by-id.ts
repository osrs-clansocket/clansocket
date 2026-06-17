import { getDiscordGuildDb } from "../database-discord.js";
import type { AutoHookRow } from "./list.js";

const SELECT_SQL = `SELECT auto_hook_id, auto_hook_name, guild_id, trigger_type, webhook_id,
    content_template, use_embed, embed_template_json, conditions_json, enabled,
    webhook_username_override, webhook_avatar_url_override,
    created_by_account_id, created_by_account_name, created_at, updated_at
FROM discord_auto_hooks
WHERE auto_hook_id = ?`;

export function getAutoHookById(clanId: string, guildId: string, autoHookId: string): AutoHookRow | null {
    const db = getDiscordGuildDb(clanId, guildId);
    const row = db.prepare(SELECT_SQL).get(autoHookId) as AutoHookRow | undefined;
    return row ?? null;
}
