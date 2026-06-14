import { runDiscordBotWrite } from "../db-runners.js";

const SECONDS_PER_MINUTE = 60;
const MINUTES_TTL = 15;
const MS_PER_SECOND = 1000;
const INTERACTION_TTL_MS = MINUTES_TTL * SECONDS_PER_MINUTE * MS_PER_SECOND;

export interface InteractionPendingInput {
    interactionId: string;
    botId: string;
    botName?: string | null;
    guildId: string | null;
    channelId: string;
    channelName?: string | null;
    userId: string;
    kind: string;
    encryptedTokenB64: string;
    tokenIvB64: string;
    tokenKeyId?: string | null;
}

const INSERT_SQL = `INSERT INTO discord_interactions_pending (
    interaction_id, bot_id, bot_name, guild_id, channel_id, channel_name, user_id,
    kind, encrypted_token_b64, token_iv_b64, token_key_id,
    created_at, expires_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(interaction_id) DO UPDATE SET
    encrypted_token_b64 = excluded.encrypted_token_b64,
    token_iv_b64 = excluded.token_iv_b64,
    updated_at = excluded.updated_at`;

function nullable<T>(v: T | null | undefined): T | null {
    return v ?? null;
}

function buildRowParams(input: InteractionPendingInput, now: number, expiresAt: number): unknown[] {
    return [
        input.interactionId,
        input.botId,
        nullable(input.botName),
        input.guildId,
        input.channelId,
        nullable(input.channelName),
        input.userId,
        input.kind,
        input.encryptedTokenB64,
        input.tokenIvB64,
        nullable(input.tokenKeyId),
        now,
        expiresAt,
        now,
    ];
}

export function upsertInteractionPending(input: InteractionPendingInput): void {
    const now = Date.now();
    const expiresAt = now + INTERACTION_TTL_MS;
    runDiscordBotWrite(INSERT_SQL, ...buildRowParams(input, now, expiresAt));
}
