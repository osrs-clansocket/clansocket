import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../api/middleware.js";
import { recordOutboundFailure } from "../../../database/discord/outbound/record-failure.js";
import { markApplied, markFailed, markInFlight } from "../../../database/discord/outbound/transition.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR } from "../../../shared/http/http-status.js";

const STATE_IN_FLIGHT = "in_flight";
const STATE_APPLIED = "applied";
const STATE_FAILED = "failed";
const ERROR_CODE_DEFAULT = 0;

interface TransitionBody {
    state: string;
    responseMessageId?: string | null;
    errorCode?: number;
    attemptNo?: number;
    errorBodyHash?: string | null;
}

interface TransitionResult {
    ok: boolean;
}

type StateHandler = (queueId: string, body: TransitionBody) => TransitionResult;

function handleFailed(queueId: string, body: TransitionBody): TransitionResult {
    const errorCode = body.errorCode ?? ERROR_CODE_DEFAULT;
    markFailed(queueId, errorCode);
    if (body.attemptNo !== undefined) {
        recordOutboundFailure({
            queueId,
            attemptNo: body.attemptNo,
            errorCode,
            errorBodyHash: body.errorBodyHash ?? null,
        });
    }
    return { ok: true };
}

const STATE_HANDLERS: Record<string, StateHandler> = {
    [STATE_IN_FLIGHT]: (queueId) => ({ ok: markInFlight(queueId) }),
    [STATE_APPLIED]: (queueId, body) => {
        markApplied(queueId, body.responseMessageId ?? null);
        return { ok: true };
    },
    [STATE_FAILED]: handleFailed,
};

const router: Router = Router();

router.post(
    "/:queueId/state",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const queueId = req.params.queueId as string;
        const body = req.body as TransitionBody;
        try {
            const handler = STATE_HANDLERS[body.state];
            if (!handler) {
                res.status(HTTP_BAD_REQUEST).json({ error: "invalid_state" });
                return;
            }
            res.json(handler(queueId, body));
        } catch (err) {
            logger.error(`[discord] outbound transition failed for ${queueId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "outbound_transition_failed" });
        }
    }),
);

export default router;
