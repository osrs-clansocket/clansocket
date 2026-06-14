import { HTTP_NOT_FOUND } from "../../../../shared/http/http-status.js";
import type { Response } from "express";
import { getSiteAccountById, type SiteAccountRow } from "../../../../database/site/site-account-helpers/index.js";
import { insertNotification } from "../../../../notifications/helpers.js";

export { challengeOf } from "../../challenge-helpers.js";

export const MAX_PASSKEYS = 10;
export const OK_FLAG = true;

export function audit(siteAccountId: string, title: string, body: string): void {
    insertNotification({ siteAccountId, kind: "auth_audit", title, body, href: "/account" });
}

export function loadAccountOr404(siteAccountId: string, res: Response): SiteAccountRow | null {
    const account = getSiteAccountById(siteAccountId);
    if (account === null) {
        res.status(HTTP_NOT_FOUND).json({ error: "account_not_found" });
        return null;
    }
    return account;
}
