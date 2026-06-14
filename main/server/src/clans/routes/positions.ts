import { Router, type Request, type RequestHandler, type Response } from "express";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { listClanPluginModes } from "../../database/index.js";
import { subscribeProjection } from "../../data-rights/streams/projection.js";
import { positionsTopic } from "../../data-rights/streams/topics/positions-topic.js";
import { getMapMeta, listMapPlanes } from "../../map-assets/world-map-db.js";
import { HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { withClanMember, type ClanMemberContext } from "../require-clan-member.js";

interface ModeResolution {
    mode: string | null;
    available: string[];
    badRequest: boolean;
}

function resolvePluginMode(clanId: string, requested: unknown): ModeResolution {
    const available = listClanPluginModes(clanId);
    const explicit = typeof requested === "string" && requested.length > 0 ? requested : "";
    const badRequest = explicit.length > 0 && !available.includes(explicit);
    const resolved = badRequest ? "" : explicit || available[0] || "";
    return { mode: resolved.length > 0 ? resolved : null, available, badRequest };
}

function openEventStream(res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write(": stream open\n\n");
}

function writeSseFrame(res: Response, payload: unknown, onError: () => void): void {
    try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
        onError();
    }
}

function clanMemberHandler(fn: (ctx: ClanMemberContext, req: Request, res: Response) => void): RequestHandler {
    return (req, res) => withClanMember(req, res, req.siteAccountId!, (ctx) => fn(ctx, req, res));
}

const router = Router();

router.get(
    "/:slug/positions",
    requireSiteAccount,
    clanMemberHandler((ctx, req, res) => {
        const { mode, available, badRequest } = resolvePluginMode(ctx.clanId, req.query.mode);
        if (badRequest) {
            res.status(HTTP_NOT_FOUND).json({ error: "mode_not_found", availableModes: available });
            return;
        }
        const rows = mode ? positionsTopic(ctx.clanId, mode).query() : [];
        res.json({ rows, mode, availableModes: available, mapMeta: getMapMeta(), planes: listMapPlanes() });
    }),
);

router.get(
    "/:slug/positions/stream",
    requireSiteAccount,
    clanMemberHandler((ctx, req, res) => {
        const { mode, available, badRequest } = resolvePluginMode(ctx.clanId, req.query.mode);
        if (badRequest || !mode) {
            res.status(HTTP_NOT_FOUND).json({ error: "mode_not_found", availableModes: available });
            return;
        }
        openEventStream(res);
        const handle = subscribeProjection(
            `clan_positions:${ctx.clanId}:${mode}`,
            positionsTopic(ctx.clanId, mode),
            (batch) => writeSseFrame(res, batch, dispose),
        );
        function dispose(): void {
            handle.unsubscribe();
        }
        writeSseFrame(
            res,
            {
                snapshot: handle.baseline,
                mode,
                availableModes: available,
                mapMeta: getMapMeta(),
                planes: listMapPlanes(),
            },
            dispose,
        );
        req.on("close", dispose);
        req.on("error", dispose);
    }),
);

export default router;
