import { HTTP_BAD_REQUEST } from "../../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { type Request, type Response, Router } from "express";
import { type ChainMode } from "../../persona/prompt/index.js";
import { chainGraph } from "../../chain/chain/index.js";
import { incomingQueue } from "../../lifecycle/incoming-queue.js";
import { chainStateStore } from "../../chain/chain-state-store.js";
import { startChain, advanceChain, type ChainStepResult } from "../../chain/chain-step/index.js";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { CHAIN_MODE_CONTINUOUS, CHAIN_MODE_REACTIVE } from "../../chain/chain-modes.js";
import { buildActionFeedbackText } from "./feedback.js";
import {
    type SendBody,
    normalizeHistory,
    normalizeModeOverrides,
    normalizePersonaOverrides,
    normalizeProfile,
    resolveMaxTokens,
    validateSendBody,
} from "./normalize.js";
import { resolveModel } from "./llm.js";
import { sleep, streamLlmCall, writeSseComment, writeSseEvent } from "./stream.js";

const router = Router();

router.post("/send", requireSiteAccount, async (req: Request, res: Response) => {
    const body = req.body as SendBody;
    const validationError = validateSendBody(body);
    if (validationError !== null) {
        res.status(HTTP_BAD_REQUEST).json({ error: validationError });
        return;
    }
    if (body.kind === "action-feedback") {
        body.text = buildActionFeedbackText(body.actionResults, body.priorChainId);
    }
    const siteAccountId = req.siteAccountId!;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    writeSseComment(res, "stream-open");
    const abortRef = { aborted: false };
    res.on("close", () => {
        if (!res.writableEnded && !abortRef.aborted) {
            logger.warn(
                `[ai/chat/send] client disconnected (res.close, !writableEnded) account=${siteAccountId} provider=${body.provider} model=${body.model ?? "(default)"}`,
            );
            abortRef.aborted = true;
        }
    });
    logger.info(
        `[ai/chat/send] start account=${siteAccountId} provider=${body.provider} model=${body.model ?? "(default)"} mode=${body.mode}`,
    );
    try {
        const chainMode: ChainMode =
            body.chainMode === CHAIN_MODE_CONTINUOUS ? CHAIN_MODE_CONTINUOUS : CHAIN_MODE_REACTIVE;
        if (chainGraph.active(siteAccountId)) {
            const queued = incomingQueue.enqueue(siteAccountId, body.text!);
            writeSseEvent(res, { type: "queued", queueLength: queued });
            res.end();
            return;
        }
        const normalizedLastTurn =
            body.lastTurn && typeof body.lastTurn.raw === "string" && typeof body.lastTurn.userMessage === "string"
                ? { raw: body.lastTurn.raw, userMessage: body.lastTurn.userMessage }
                : null;
        const state = chainStateStore.create({
            siteAccountId,
            instruction: body.text!,
            mode: body.mode!,
            chainMode,
            pageState: body.pageState ?? null,
            history: normalizeHistory(body.history),
            profile: normalizeProfile(body.profile),
            personaOverrides: normalizePersonaOverrides(body.personaOverrides),
            modeOverrides: normalizeModeOverrides(body.modeOverrides),
            extraContext: [],
            lastTurn: normalizedLastTurn,
        });
        const maxTokens = resolveMaxTokens(body.maxTokens);
        const model = resolveModel(body.provider!, body.model);
        logger.info(`[ai/chat/send] resolved model=${model} maxTokens=${maxTokens}`);
        let step: ChainStepResult = await startChain(state);
        for (const ev of step.events) writeSseEvent(res, { type: "chain-event", event: ev });
        let iterations = 0;
        while (step.kind === "call_llm") {
            iterations += 1;
            if (abortRef.aborted) {
                logger.warn(`[ai/chat/send] loop break iter=${iterations} reason=aborted (pre-llm)`);
                break;
            }
            if (step.nextPollSeconds !== null && step.nextPollSeconds > 0) {
                await sleep(step.nextPollSeconds * 1000, abortRef);
                if (abortRef.aborted) {
                    logger.warn(`[ai/chat/send] loop break iter=${iterations} reason=aborted (post-sleep)`);
                    break;
                }
            }
            const llmText = await streamLlmCall(
                body.apiKey!,
                body.provider!,
                model,
                maxTokens,
                step.system,
                step.messages,
                (delta) => writeSseEvent(res, { type: "delta", delta }),
                abortRef,
            );
            logger.info(
                `[ai/chat/send] llm returned iter=${iterations} bytes=${llmText.length} aborted=${abortRef.aborted}`,
            );
            if (abortRef.aborted) {
                logger.warn(`[ai/chat/send] loop break iter=${iterations} reason=aborted (post-llm)`);
                break;
            }
            step = await advanceChain(step.chainId, llmText);
            for (const ev of step.events) writeSseEvent(res, { type: "chain-event", event: ev });
        }
        if (!abortRef.aborted && step.kind === "done") {
            writeSseEvent(res, { type: "done", result: step.result });
            logger.info(`[ai/chat/send] done emitted account=${siteAccountId} iters=${iterations}`);
        } else {
            logger.warn(
                `[ai/chat/send] exit without done aborted=${abortRef.aborted} stepKind=${step.kind} iters=${iterations}`,
            );
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        logger.error(`[ai/chat/send] threw: ${message}${stack ? `\n${stack}` : ""}`);
        chainGraph.discard(siteAccountId);
        incomingQueue.clear(siteAccountId);
        if (!abortRef.aborted) writeSseEvent(res, { type: "error", error: message });
    } finally {
        res.end();
    }
});

export default router;
