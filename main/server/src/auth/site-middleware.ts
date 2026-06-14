import { ERROR_ACCOUNT_NOT_FOUND, ERROR_NOT_AUTHENTICATED } from "../shared/error-reasons.js";
import { HTTP_FORBIDDEN, HTTP_UNAUTHORIZED } from "../shared/http/http-status.js";
import type { Request, Response, NextFunction } from "express";
import { verifySiteSession } from "./site-session";
import { getSiteAccountById } from "../database/site/site-account-helpers/index.js";
import { listClanManagersForAccount } from "../database/clans/access/clan-manager-helpers.js";
import { COOKIE_SITE_SESSION } from "./oauth-providers.js";
import { readCookie } from "./site-routes/oauth-helpers.js";

declare module "express-serve-static-core" {
    interface Request {
        siteAccountId?: string;
    }
}

export function requireSiteAccount(req: Request, res: Response, next: NextFunction): void {
    const sessionId = readCookie(req, COOKIE_SITE_SESSION);
    const session = verifySiteSession(sessionId);
    if (!session) {
        res.status(HTTP_UNAUTHORIZED).json({ error: ERROR_NOT_AUTHENTICATED });
        return;
    }
    const account = getSiteAccountById(session.siteAccountId);
    if (!account) {
        res.status(HTTP_UNAUTHORIZED).json({ error: ERROR_ACCOUNT_NOT_FOUND });
        return;
    }
    req.siteAccountId = account.id;
    next();
}

export function requireBoundAccount(req: Request, res: Response, next: NextFunction): void {
    if (!req.siteAccountId) {
        res.status(HTTP_UNAUTHORIZED).json({ error: ERROR_NOT_AUTHENTICATED });
        return;
    }
    const managed = listClanManagersForAccount(req.siteAccountId);
    if (managed.length === 0) {
        res.status(HTTP_FORBIDDEN).json({
            error: "account_not_bound",
            message: "No clan managed by this account. Claim a clan or request manager access.",
        });
        return;
    }
    next();
}
