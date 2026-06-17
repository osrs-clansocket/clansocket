import { Router, type Request, type Response } from "express";
import { COOKIE_SITE_SESSION } from "../../auth/oauth-providers.js";
import { readCookie } from "../../auth/site-routes/oauth-helpers.js";
import { verifySiteSession } from "../../auth/site-session.js";
import { isSiteOwner } from "../site-owner.js";

const router: Router = Router();

router.get("/me", (req: Request, res: Response) => {
    const sessionId = readCookie(req, COOKIE_SITE_SESSION);
    const session = verifySiteSession(sessionId);
    res.json({ isOwner: isSiteOwner(session?.siteAccountId) });
});

export default router;
