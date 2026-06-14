import { HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { getClanBySlug } from "../../../database/index.js";
import { findIconPath, findPristineIconPath, ICON_MIME_BY_EXT } from "../../icon/filesystem.js";

const router: Router = Router();

router.get("/:slug/icon", (req: Request, res: Response) => {
    const slug = String(req.params.slug ?? "").toLowerCase();
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).end();
        return;
    }
    if (clan.icon_kind !== "image") {
        res.status(HTTP_NOT_FOUND).end();
        return;
    }
    const wantPristine = req.query.pristine === "1";
    const found = wantPristine ? findPristineIconPath(clan.id) : findIconPath(clan.id);
    if (!found) {
        res.status(HTTP_NOT_FOUND).end();
        return;
    }
    const mime = ICON_MIME_BY_EXT[found.ext] ?? "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.sendFile(found.path);
});

export default router;
