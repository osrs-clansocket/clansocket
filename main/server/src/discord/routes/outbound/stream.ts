import { Router, type Request, type Response } from "express";
import { SCOPE_DISCORD_BOT, subscribeDbWrites } from "../../../data-rights/streams/writes-stream.js";
import { HTTP_OK } from "../../../shared/http/http-status.js";

const OUTBOUND_TABLE = "discord_outbound_events";
const INSERT_KIND = "insert";

const router: Router = Router();

router.get("/stream/:botId", (req: Request, res: Response) => {
    const botId = req.params.botId as string;
    res.writeHead(HTTP_OK, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ botId })}\n\n`);
    const unsubscribe = subscribeDbWrites((event) => {
        if (event.scopeKey !== SCOPE_DISCORD_BOT) return;
        if (event.table !== OUTBOUND_TABLE) return;
        if (event.kind !== INSERT_KIND) return;
        res.write(`event: outbound\ndata: ${JSON.stringify({ botId })}\n\n`);
    });
    req.on("close", () => unsubscribe());
});

export default router;
