import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../auth/site-middleware.js";
import { dismissNotification, listNotificationViews } from "./helpers.js";
import {
    sweepForManager,
    sweepStaleUnclaimedRows,
    sweepDisplacedAccounts,
} from "../data-rights/purge/purge-dead-clans/index.js";

const router = Router();

router.get("/", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    // Conditional sweep: dead-clan check runs over the user's managed clans before
    // notifications get listed, so any newly-triggered warn/purge notifs land in the
    // same response. Stale unclaimed rows are unrelated to this user but cheap to sweep.
    sweepForManager(siteAccountId);
    sweepStaleUnclaimedRows();
    sweepDisplacedAccounts();
    res.json({ notifications: listNotificationViews(siteAccountId) });
});

router.post("/:id/dismiss", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const id = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isFinite(id) || id <= 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_id" });
        return;
    }
    const ok = dismissNotification(id, siteAccountId);
    if (!ok) {
        res.status(HTTP_NOT_FOUND).json({ error: "not_found" });
        return;
    }
    res.json({ ok: true });
});

export default router;
