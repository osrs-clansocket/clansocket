import { encryptToken } from "../../../crypto/aes-gcm-encrypter.js";
import { getClanVaultMasterKey } from "../../../crypto/clan-vault-master-key-loader.js";
import { getDiscordGuildDb } from "../database-discord.js";

const UPSERT_SQL = `INSERT INTO discord_webhook_tokens
    (webhook_id, guild_id, channel_id, channel_name, encrypted_token_b64, token_iv_b64,
     acquired_by_bot_id, bound_by_site_account_id, bound_by_site_account_name, bound_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(webhook_id) DO UPDATE SET
    channel_id = excluded.channel_id,
    channel_name = excluded.channel_name,
    encrypted_token_b64 = excluded.encrypted_token_b64,
    token_iv_b64 = excluded.token_iv_b64,
    acquired_by_bot_id = excluded.acquired_by_bot_id,
    revoked_at = NULL,
    updated_at = excluded.updated_at`;

export interface UpsertWebhookTokenInput {
    clanId: string;
    guildId: string;
    webhookId: string;
    channelId: string;
    channelName: string | null;
    plaintextToken: string;
    acquiredByBotId: string | null;
    boundBySiteAccountId: string | null;
    boundBySiteAccountName: string | null;
}

export function upsertWebhookToken(input: UpsertWebhookTokenInput): void {
    const { b64, iv } = encryptToken(input.plaintextToken, getClanVaultMasterKey());
    const db = getDiscordGuildDb(input.clanId, input.guildId);
    const now = Date.now();
    db.prepare(UPSERT_SQL).run(
        input.webhookId,
        input.guildId,
        input.channelId,
        input.channelName,
        b64,
        iv,
        input.acquiredByBotId,
        input.boundBySiteAccountId,
        input.boundBySiteAccountName,
        now,
        now,
    );
}
