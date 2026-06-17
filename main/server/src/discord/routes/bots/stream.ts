import { Router, type Request, type Response } from "express";
import { authenticate } from "../../../api/middleware.js";
import { SCOPE_DISCORD_BOT, subscribeDbWrites } from "../../../data-rights/streams/writes-stream.js";
import { HTTP_OK } from "../../../shared/http/http-status.js";

const IDENTITIES_TABLE = "discord_bot_identities";

const router: Router = Router();

router.get("/stream", authenticate, (req: Request, res: Response) => {
    res.writeHead(HTTP_OK, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.write("event: ready\ndata: {}\n\n");
    const unsubscribe = subscribeDbWrites((event) => {
        if (event.scopeKey !== SCOPE_DISCORD_BOT) return;
        if (event.table !== IDENTITIES_TABLE) return;
        res.write("event: bots\ndata: {}\n\n");
    });
    req.on("close", () => unsubscribe());
});

export default router;
