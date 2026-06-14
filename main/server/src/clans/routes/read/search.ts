import { Router, type Request, type Response } from "express";
import { DB_NAMES, getDb } from "../../../database/index.js";
import { requireSiteAccount } from "../../../auth/site-middleware.js";

const router: Router = Router();

router.get("/search", requireSiteAccount, (req: Request, res: Response) => {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (rawQuery.length === 0) {
        res.json({ clans: [] });
        return;
    }
    const limit = 20;
    const prefix = `${rawQuery.toLowerCase()}%`;
    const rows = getDb(DB_NAMES.APP)
        .prepare(
            `SELECT slug, display_name, icon_kind, icon_value, color
             FROM clansocket_clans
             WHERE claimed_at IS NOT NULL
               AND archived_at IS NULL
               AND (LOWER(display_name) LIKE ? OR LOWER(slug) LIKE ?)
             ORDER BY display_name ASC
             LIMIT ?`,
        )
        .all(prefix, prefix, limit) as Array<{
        slug: string;
        display_name: string;
        icon_kind: string | null;
        icon_value: string | null;
        color: string | null;
    }>;
    res.json({
        clans: rows.map((r) => ({
            slug: r.slug,
            displayName: r.display_name,
            iconKind: r.icon_kind,
            iconValue: r.icon_value,
            color: r.color,
        })),
    });
});

export default router;
