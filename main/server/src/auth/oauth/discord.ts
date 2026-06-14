import { MIME_FORM_URLENCODED, MIME_JSON } from "../../shared/http/http-mime.js";
const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";
const SCOPES = "identify";

export interface DiscordUser {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
}

export function buildAuthorizeUrl(clientId: string, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPES,
        state,
    });
    return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
): Promise<string> {
    const res = await fetch(DISCORD_TOKEN_URL, {
        method: "POST",
        headers: {
            Accept: MIME_JSON,
            "Content-Type": MIME_FORM_URLENCODED,
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
        }).toString(),
    });
    if (!res.ok) {
        throw new Error(`discord_token_exchange_failed status=${res.status}`);
    }
    const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!json.access_token) {
        throw new Error(`discord_token_exchange_failed: ${json.error_description ?? json.error ?? "no_access_token"}`);
    }
    return json.access_token;
}

export async function fetchUser(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(DISCORD_USER_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "clansocket",
        },
    });
    if (!res.ok) throw new Error(`discord_user_fetch_failed status=${res.status}`);
    return (await res.json()) as DiscordUser;
}

export function avatarUrl(user: DiscordUser): string | null {
    if (!user.avatar) return null;
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`;
}
