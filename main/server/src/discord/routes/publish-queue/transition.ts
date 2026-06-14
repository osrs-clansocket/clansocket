import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import {
    markPublishApplied,
    markPublishFailed,
    markPublishInFlight,
} from "../../../database/discord/publish-queue/transition.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

const STATE_IN_FLIGHT = "in_flight";
const STATE_APPLIED = "applied";
const STATE_FAILED = "failed";

interface TransitionBody {
    state: string;
    snowflakeResolved?: string | null;
    errorJson?: string | null;
}

interface TransitionResult {
    ok: boolean;
}

interface TransitionContext {
    clanId: string;
    guildId: string;
    queueId: string;
}

type StateHandler = (ctx: TransitionContext, body: TransitionBody) => TransitionResult;

const STATE_HANDLERS: Record<string, StateHandler> = {
    [STATE_IN_FLIGHT]: (ctx) => ({ ok: markPublishInFlight(ctx.clanId, ctx.guildId, ctx.queueId) }),
    [STATE_APPLIED]: (ctx, body) => {
        markPublishApplied(ctx.clanId, ctx.guildId, ctx.queueId, body.snowflakeResolved ?? null);
        return { ok: true };
    },
    [STATE_FAILED]: (ctx, body) => {
        markPublishFailed(ctx.clanId, ctx.guildId, ctx.queueId, body.errorJson ?? null);
        return { ok: true };
    },
};

const router: Router = Router();

router.post(
    "/:clanId/:guildId/:queueId/state",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const ctx: TransitionContext = {
            clanId: req.params.clanId as string,
            guildId: req.params.guildId as string,
            queueId: req.params.queueId as string,
        };
        const body = req.body as TransitionBody;
        try {
            const handler = STATE_HANDLERS[body.state];
            if (!handler) {
                res.status(HTTP_BAD_REQUEST).json({ error: "invalid_state" });
                return;
            }
            res.json(handler(ctx, body));
        } catch (err) {
            logger.error(`[discord] publish-queue transition failed for ${ctx.queueId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "publish_queue_transition_failed" });
        }
    }),
);

export default router;
