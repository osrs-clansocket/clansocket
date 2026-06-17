import { getDiscordGuildDb } from "../database-discord.js";

const UPSERT_SQL = `INSERT INTO discord_auto_hooks
    (auto_hook_id, auto_hook_name, guild_id, trigger_type, webhook_id,
     content_template, use_embed, embed_template_json, conditions_json, enabled,
     webhook_username_override, webhook_avatar_url_override,
     created_by_account_id, created_by_account_name, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(auto_hook_id) DO UPDATE SET
    auto_hook_name = excluded.auto_hook_name,
    trigger_type = excluded.trigger_type,
    webhook_id = excluded.webhook_id,
    content_template = excluded.content_template,
    use_embed = excluded.use_embed,
    embed_template_json = excluded.embed_template_json,
    conditions_json = excluded.conditions_json,
    enabled = excluded.enabled,
    webhook_username_override = excluded.webhook_username_override,
    webhook_avatar_url_override = excluded.webhook_avatar_url_override,
    updated_at = excluded.updated_at`;

export interface UpsertAutoHookInput {
    clanId: string;
    guildId: string;
    autoHookId: string;
    autoHookName: string;
    triggerType: string;
    webhookId: string;
    contentTemplate: string | null;
    useEmbed: boolean;
    embedTemplateJson: string | null;
    conditionsJson: string | null;
    enabled: boolean;
    webhookUsernameOverride: string | null;
    webhookAvatarUrlOverride: string | null;
    createdByAccountId: string;
    createdByAccountName: string | null;
}

export function upsertAutoHook(input: UpsertAutoHookInput): void {
    const db = getDiscordGuildDb(input.clanId, input.guildId);
    const now = Date.now();
    db.prepare(UPSERT_SQL).run(
        input.autoHookId,
        input.autoHookName,
        input.guildId,
        input.triggerType,
        input.webhookId,
        input.contentTemplate,
        input.useEmbed ? 1 : 0,
        input.embedTemplateJson,
        input.conditionsJson,
        input.enabled ? 1 : 0,
        input.webhookUsernameOverride,
        input.webhookAvatarUrlOverride,
        input.createdByAccountId,
        input.createdByAccountName,
        now,
        now,
    );
}
