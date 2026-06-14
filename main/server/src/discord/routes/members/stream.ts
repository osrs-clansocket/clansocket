import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { subscribeProjection } from "../../../data-rights/streams/projection.js";
import { discordMembersTopic } from "../../../data-rights/streams/topics/discord-members-topic.js";
import { validateGuildId } from "../../../api/middleware.js";
import { HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";

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

const router: Router = Router();

router.get("/:guildId/stream", requireSiteAccount, validateGuildId, (req: Request, res: Response) => {
    const sid = req.siteAccountId!;
    const guildId = req.params.guildId as string;
    const server = resolveServerByGuildId(guildId);
    if (!server) {
        res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
        return;
    }
    if (!isClanManager(sid, server.clan_id)) {
        res.status(HTTP_FORBIDDEN).json({ error: "not_clan_manager" });
        return;
    }
    openEventStream(res);
    const handle = subscribeProjection(
        `discord_members:${server.clan_id}:${guildId}`,
        discordMembersTopic(server.clan_id, guildId),
        (batch) => writeSseFrame(res, batch, dispose),
    );
    function dispose(): void {
        handle.unsubscribe();
    }
    writeSseFrame(res, { snapshot: handle.baseline }, dispose);
    req.on("close", dispose);
    req.on("error", dispose);
});

export default router;
