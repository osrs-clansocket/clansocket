import { ERROR_NOT_AUTHENTICATED } from "../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED } from "../../shared/http/http-status.js";
import type { Request, Response } from "express";
import { MS_PER_DAY, MS_PER_MINUTE } from "../../shared/time.js";
import { COOKIE_OAUTH_STATE, COOKIE_SITE_SESSION } from "../oauth-providers.js";
import { verifySiteSession } from "../site-session.js";

export const STATE_COOKIE = COOKIE_OAUTH_STATE;
export const SESSION_COOKIE = COOKIE_SITE_SESSION;
export const STATE_TTL_MS = 10 * MS_PER_MINUTE;
export const SESSION_TTL_MS = 30 * MS_PER_DAY;
export const LINK_COOKIE = "cs_oauth_link";

export function publicBaseUrl(_req: Request): string {
    const fromEnv = process.env.OAUTH_PUBLIC_BASE_URL;
    if (!fromEnv) {
        throw new Error(
            "OAUTH_PUBLIC_BASE_URL must be set (host header is not trusted for OAuth redirect URL construction)",
        );
    }
    return fromEnv.replace(/\/+$/, "");
}

export function isHttps(req: Request): boolean {
    return req.protocol === "https" || req.header("x-forwarded-proto") === "https";
}

export function readCookie(req: Request, name: string): string | undefined {
    const raw = req.headers.cookie;
    if (!raw) return undefined;
    for (const part of raw.split(";")) {
        const [k, ...v] = part.trim().split("=");
        if (k === name) return decodeURIComponent(v.join("="));
    }
    return undefined;
}

export function githubConfigured(): boolean {
    return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function discordClientId(): string | undefined {
    return process.env.CLIENT_ID;
}

export function discordConfigured(): boolean {
    return Boolean(discordClientId() && process.env.DISCORD_CLIENT_SECRET);
}

const OAUTH_PATH = "/api/auth/site";
const ROOT_PATH = "/";

function setSecureCookie(res: Response, req: Request, name: string, value: string, maxAge: number, path: string): void {
    res.cookie(name, value, {
        httpOnly: true,
        secure: isHttps(req),
        sameSite: "lax",
        maxAge,
        path,
    });
}

function clearOauthCookie(res: Response, name: string): void {
    res.clearCookie(name, { path: OAUTH_PATH });
}

export function setStateCookie(res: Response, req: Request, state: string): void {
    setSecureCookie(res, req, STATE_COOKIE, state, STATE_TTL_MS, OAUTH_PATH);
}

export function setLinkCookie(res: Response, req: Request, siteAccountId: string): void {
    setSecureCookie(res, req, LINK_COOKIE, siteAccountId, STATE_TTL_MS, OAUTH_PATH);
}

export function consumeLinkCookie(req: Request, res: Response): string | null {
    const v = readCookie(req, LINK_COOKIE);
    clearOauthCookie(res, LINK_COOKIE);
    return v ?? null;
}

export function setSessionCookie(res: Response, req: Request, sessionId: string): void {
    setSecureCookie(res, req, SESSION_COOKIE, sessionId, SESSION_TTL_MS, ROOT_PATH);
}

export function validateOauthState(req: Request, res: Response): { code: string; ok: boolean } {
    const code = req.query.code;
    const state = req.query.state;
    const expected = readCookie(req, STATE_COOKIE);
    if (typeof code !== "string" || typeof state !== "string" || !expected || state !== expected) {
        clearOauthCookie(res, STATE_COOKIE);
        res.status(HTTP_BAD_REQUEST).send("invalid_oauth_state");
        return { code: "", ok: false };
    }
    clearOauthCookie(res, STATE_COOKIE);
    return { code, ok: true };
}

export function requireSiteAccountId(req: Request, res: Response): string | null {
    const sessionId = readCookie(req, SESSION_COOKIE);
    const session = verifySiteSession(sessionId);
    if (!session) {
        res.status(HTTP_UNAUTHORIZED).json({ error: ERROR_NOT_AUTHENTICATED });
        return null;
    }
    return session.siteAccountId;
}
