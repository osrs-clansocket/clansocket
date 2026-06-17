import type { VerifyStatus } from "../../../clan-vault/shared/vault-types.js";
import { MIME_JSON } from "../../../shared/http/http-mime.js";
import { HTTP_FORBIDDEN, HTTP_TOO_MANY_REQUESTS, HTTP_UNAUTHORIZED } from "../../../shared/http/http-status.js";
import type { DiscordBotPayload } from "../types/byo-bot-types.js";

const DISCORD_BOT_USERS_ME = "https://discord.com/api/v10/users/@me";

interface BotUserResponse {
    id?: string;
    username?: string;
    bot?: boolean;
}

export interface VerifyDiscordBotResult {
    status: VerifyStatus;
    public_metadata?: {
        username: string;
        application_id: string;
    };
}

export async function verifyDiscordBotCredentials(payload: DiscordBotPayload): Promise<VerifyDiscordBotResult> {
    const res = await fetch(DISCORD_BOT_USERS_ME, {
        method: "GET",
        headers: {
            Accept: MIME_JSON,
            Authorization: `Bot ${payload.bot_token}`,
        },
    });
    if (res.status === HTTP_UNAUTHORIZED || res.status === HTTP_FORBIDDEN) {
        return { status: "auth-failed" };
    }
    if (res.status === HTTP_TOO_MANY_REQUESTS) return { status: "rate-limited" };
    if (!res.ok) return { status: "unreachable" };
    const body = (await res.json()) as BotUserResponse;
    if (!body.username) return { status: "auth-failed" };
    return {
        status: "ok",
        public_metadata: {
            username: body.username,
            application_id: payload.application_id,
        },
    };
}
