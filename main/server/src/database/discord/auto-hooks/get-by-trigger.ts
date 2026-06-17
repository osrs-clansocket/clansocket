import { getDiscordGuildDb } from "../database-discord.js";
import type { AutoHookRow } from "./list.js";

const SELECT_SQL = `SELECT auto_hook_id, auto_hook_name, guild_id, trigger_type, webhook_id,
    content_template, use_embed, embed_template_json, conditions_json, enabled,
    webhook_username_override, webhook_avatar_url_override,
    created_by_account_id, created_by_account_name, created_at, updated_at
FROM discord_auto_hooks
WHERE guild_id = ? AND trigger_type = ? AND enabled = 1`;

export function getAutoHooksByTrigger(clanId: string, guildId: string, triggerType: string): AutoHookRow[] {
    const db = getDiscordGuildDb(clanId, guildId);
    return db.prepare(SELECT_SQL).all(guildId, triggerType) as AutoHookRow[];
}
