import { ERROR_EXPORT_FAILED, ERROR_COOLDOWN } from "../../shared/error-reasons.js";
import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_TOO_MANY_REQUESTS } from "../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { listAccountHashesForSiteAccount } from "../../database/index.js";
import { checkCooldown, recordAction } from "../cooldown.js";
import { collectUserData } from "../collect/collect-user/index.js";
import { collectUserStats } from "../collect/collect-user-stats/index.js";
import { ownedActiveClansForAccount, purgeUserData } from "../purge/purge-user/index.js";
import { purgeClanData } from "../purge/purge-clan.js";
import { streamZipToResponse } from "../collect/zip-stream.js";
import { ACTION_USER_EXPORT } from "../scopes/action-kinds.js";
import { COOKIE_SITE_SESSION } from "../../auth/oauth-providers.js";

const SESSION_COOKIE = COOKIE_SITE_SESSION;

const router = Router();

function bucketLabel(retryAfterMs: number): string {
    const seconds = Math.ceil(retryAfterMs / 1000);
    if (seconds <= 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.ceil(minutes / 60);
    return hours === 1 ? "1 hour" : `${hours} hours`;
}

router.get("/me/stats", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    const stats = collectUserStats(siteAccountId, hashes);
    res.json(stats);
});

router.get("/me/export", requireSiteAccount, async (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const cooldown = checkCooldown(siteAccountId, ACTION_USER_EXPORT, null);
    if (!cooldown.ok) {
        res.status(HTTP_TOO_MANY_REQUESTS).json({
            error: ERROR_COOLDOWN,
            message: `Wait ${bucketLabel(cooldown.retryAfterMs!)} before exporting again.`,
            retryAfterMs: cooldown.retryAfterMs,
        });
        return;
    }
    const hashes = listAccountHashesForSiteAccount(siteAccountId);
    if (hashes.length === 0) {
        res.status(HTTP_NOT_FOUND).json({ error: "no_data", message: "No game data linked to this account." });
        return;
    }

    const allEntries = [] as Awaited<ReturnType<typeof collectUserData>>["entries"];
    const summaries: Array<Awaited<ReturnType<typeof collectUserData>>["summary"]> = [];
    for (const hash of hashes) {
        const collected = collectUserData(hash, siteAccountId);
        for (const e of collected.entries) {
            if (e.path === "manifest.json") continue;
            allEntries.push({ ...e, path: `${hash}/${e.path}` });
        }
        summaries.push(collected.summary);
    }
    allEntries.unshift({
        path: "manifest.json",
        json: { exportedAt: Date.now(), siteAccountId, accountHashes: hashes, perAccountSummaries: summaries },
    });

    try {
        await streamZipToResponse(allEntries, res, `clansocket-user-export-${siteAccountId}.zip`);
        recordAction(siteAccountId, ACTION_USER_EXPORT, null);
    } catch (err) {
        if (!res.headersSent) {
            res.status(HTTP_INTERNAL_ERROR).json({ error: ERROR_EXPORT_FAILED, message: (err as Error).message });
        }
    }
});

router.post("/me/delete", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const hashes = listAccountHashesForSiteAccount(siteAccountId);

    const purgedClans: string[] = [];
    for (const hash of hashes) {
        for (const clan of ownedActiveClansForAccount(hash)) {
            purgeClanData(clan.id);
            purgedClans.push(clan.slug);
        }
    }

    const userResults = hashes.map((hash) => purgeUserData(hash, siteAccountId));

    res.clearCookie(SESSION_COOKIE, { path: "/" });

    res.json({ ok: true, purgedClans, userResults });
});

export { bucketLabel };
export default router;
