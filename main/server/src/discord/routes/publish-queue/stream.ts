import { Router, type Request, type Response } from "express";
import { authenticate } from "../../../api/middleware.js";
import { scopeKeyForDiscordGuild, subscribeDbWrites } from "../../../data-rights/streams/writes-stream.js";
import { HTTP_OK } from "../../../shared/http/http-status.js";

const QUEUE_TABLE = "discord_draft_publish_queue";
const INSERT_KIND = "insert";

const router: Router = Router();

router.get("/stream/:clanId/:guildId", authenticate, (req: Request, res: Response) => {
    const clanId = req.params.clanId as string;
    const guildId = req.params.guildId as string;
    const expectedScope = scopeKeyForDiscordGuild(clanId, guildId);
    res.writeHead(HTTP_OK, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ clanId, guildId })}\n\n`);
    const unsubscribe = subscribeDbWrites((event) => {
        if (event.scopeKey !== expectedScope) return;
        if (event.table !== QUEUE_TABLE) return;
        if (event.kind !== INSERT_KIND) return;
        res.write(`event: publish\ndata: ${JSON.stringify({ clanId, guildId })}\n\n`);
    });
    req.on("close", () => unsubscribe());
});

export default router;
