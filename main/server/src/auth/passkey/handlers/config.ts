import type { Request, Response } from "express";
import { mintSiteSession } from "../../site-session.js";
import { COOKIE_SITE_SESSION } from "../../oauth-providers.js";
import { MS_PER_DAY } from "../../../shared/time.js";

const SESSION_COOKIE_MAX_AGE_DAYS = 30;

export function rpId(req: Request): string {
    const env = process.env.WEBAUTHN_RP_ID;
    if (env) return env;
    if (process.env.NODE_ENV === "production") {
        throw new Error("WEBAUTHN_RP_ID must be set in production");
    }
    return req.hostname ?? "localhost";
}

export function rpName(): string {
    if (!process.env.WEBAUTHN_RP_NAME) throw new Error("WEBAUTHN_RP_NAME env var required");
    return process.env.WEBAUTHN_RP_NAME;
}

export function expectedOrigin(req: Request): string {
    if (process.env.WEBAUTHN_ORIGIN) return process.env.WEBAUTHN_ORIGIN;
    if (process.env.NODE_ENV === "production") {
        throw new Error("WEBAUTHN_ORIGIN must be set in production");
    }
    const proto = req.header("x-forwarded-proto") ?? req.protocol;
    const host = req.get("host") ?? "localhost";
    return `${proto}://${host}`;
}

export function issueSession(res: Response, req: Request, siteAccountId: string): string {
    const session = mintSiteSession(siteAccountId);
    res.cookie(COOKIE_SITE_SESSION, session.id, {
        httpOnly: true,
        secure: req.protocol === "https" || req.header("x-forwarded-proto") === "https",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_COOKIE_MAX_AGE_DAYS * MS_PER_DAY,
    });
    return session.id;
}
