import { HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { DB_NAMES, getClanBySlug, getDb } from "../../../database/index.js";

const router: Router = Router();

// Non-voxlab clans (icon_kind = image / builtin / null) return 200 with a
// JSON `null` body — the resource exists, it's just unset. 404 is reserved
// for unknown / archived clans. This keeps devtools quiet during the
// voxlab page's pre-publish check (which probes /icon-record unconditionally
// to decide between the re-edit path and the raster path).
router.get("/:slug/icon-record", (req: Request, res: Response) => {
    const slug = String(req.params.slug ?? "").toLowerCase();
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).end();
        return;
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=60");
    if (clan.icon_kind !== "voxlab") {
        res.send("null");
        return;
    }
    const row = getDb(DB_NAMES.APP)
        .prepare(`SELECT icon_voxlab_record FROM clansocket_clans WHERE id = ?`)
        .get(clan.id) as { icon_voxlab_record: string | null } | undefined;
    if (!row?.icon_voxlab_record) {
        res.send("null");
        return;
    }
    res.send(row.icon_voxlab_record);
});

export default router;
