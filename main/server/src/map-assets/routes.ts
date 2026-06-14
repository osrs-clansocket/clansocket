import { Router, type Request, type Response } from "express";
import { listMapRegions } from "./world-map-db.js";

const CACHE_HEADER = "public, max-age=3600, stale-while-revalidate=86400";

const router = Router();

router.get("/regions", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", CACHE_HEADER);
    res.json({ regions: listMapRegions() });
});

export default router;
