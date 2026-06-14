import { MIME_FORM_URLENCODED, MIME_JSON } from "../../shared/http/http-mime.js";

const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const BOT_SCOPES = "bot applications.commands";
const PERMISSION_ADMINISTRATOR = "8";
const RADIX_DECIMAL = 10;

export interface BotInstallResult {
    accessToken: string;
    guildId: string;
    guildName: string;
    permissions: number;
}

export function buildBotInstallUrl(clientId: string, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: BOT_SCOPES,
        permissions: PERMISSION_ADMINISTRATOR,
        state,
    });
    return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeBotInstallCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
): Promise<BotInstallResult> {
    const res = await fetch(DISCORD_TOKEN_URL, {
        method: "POST",
        headers: { Accept: MIME_JSON, "Content-Type": MIME_FORM_URLENCODED },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
        }).toString(),
    });
    if (!res.ok) throw new Error(`discord_bot_install_exchange_failed status=${res.status}`);
    const json = (await res.json()) as {
        access_token?: string;
        guild?: { id?: string; name?: string };
        permissions?: string | number;
        error?: string;
        error_description?: string;
    };
    if (!json.access_token || !json.guild?.id || !json.guild.name) {
        throw new Error(
            `discord_bot_install_exchange_failed: ${json.error_description ?? json.error ?? "missing fields"}`,
        );
    }
    return {
        accessToken: json.access_token,
        guildId: json.guild.id,
        guildName: json.guild.name,
        permissions:
            typeof json.permissions === "string" ? parseInt(json.permissions, RADIX_DECIMAL) : (json.permissions ?? 0),
    };
}
