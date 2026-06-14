import { MIME_FORM_URLENCODED, MIME_JSON } from "../../shared/http/http-mime.js";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const SCOPES = "read:user";

export interface GithubUser {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
}

export function buildAuthorizeUrl(clientId: string, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: SCOPES,
        state,
    });
    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
): Promise<string> {
    const res = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
            Accept: MIME_JSON,
            "Content-Type": MIME_FORM_URLENCODED,
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        }).toString(),
    });
    if (!res.ok) {
        throw new Error(`github_token_exchange_failed status=${res.status}`);
    }
    const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!json.access_token) {
        throw new Error(`github_token_exchange_failed: ${json.error_description ?? json.error ?? "no_access_token"}`);
    }
    return json.access_token;
}

export async function fetchUser(accessToken: string): Promise<GithubUser> {
    const res = await fetch(GITHUB_USER_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "clansocket",
        },
    });
    if (!res.ok) throw new Error(`github_user_fetch_failed status=${res.status}`);
    return (await res.json()) as GithubUser;
}
