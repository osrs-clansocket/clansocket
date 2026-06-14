import { Router } from "express";
import { DB_NAMES, getClanPluginMetrics, getDb } from "../database/index.js";
import { requireSiteAccount } from "../auth/site-middleware.js";
import { getPluginConnectedCount } from "./session/session-registry/index.js";

const router = Router();

router.get("/metrics", requireSiteAccount, (_req, res) => {
    const appDb = getDb(DB_NAMES.APP);
    const clans = appDb.prepare("SELECT id FROM clansocket_clans WHERE archived_at IS NULL").all() as { id: string }[];
    let totalSessions = 0;
    let uniqueAccounts = 0;
    let rsnChanges = 0;
    for (const clan of clans) {
        const m = getClanPluginMetrics(clan.id);
        totalSessions += m.totalSessions;
        uniqueAccounts += m.uniqueAccounts;
        rsnChanges += m.rsnChanges;
    }
    res.json({
        connected: getPluginConnectedCount(),
        totalSessions,
        uniqueAccounts,
        rsnChanges,
    });
});

export default router;
