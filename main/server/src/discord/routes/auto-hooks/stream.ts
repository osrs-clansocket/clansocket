import { Router, type Request, type Response } from "express";
import { authenticate, validateGuildId } from "../../../api/middleware.js";
import { resolveClanIdForGuild } from "../../../database/discord/audit/resolve-clan.js";
import { scopeKeyForDiscordGuild, subscribeDbWrites } from "../../../data-rights/streams/writes-stream.js";
import { HTTP_NOT_FOUND, HTTP_OK } from "../../../shared/http/http-status.js";

const TABLE = "discord_auto_hooks";

const router: Router = Router();

router.get("/:guildId/stream", authenticate, validateGuildId, (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const clanId = resolveClanIdForGuild(guildId);
    if (!clanId) {
        res.status(HTTP_NOT_FOUND).json({ error: "guild_not_bound" });
        return;
    }
    const expectedScope = scopeKeyForDiscordGuild(clanId, guildId);
    res.writeHead(HTTP_OK, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ clanId, guildId })}\n\n`);
    const unsubscribe = subscribeDbWrites((event) => {
        if (event.scopeKey !== expectedScope) return;
        if (event.table !== TABLE) return;
        res.write(`event: change\ndata: ${JSON.stringify({ guildId, kind: event.kind })}\n\n`);
    });
    req.on("close", () => unsubscribe());
});

export default router;
