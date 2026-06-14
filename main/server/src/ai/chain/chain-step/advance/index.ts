import logger from "@clansocket/logger";
import { ROLE_ASSISTANT, ROLE_USER } from "../../../persona/role-constants.js";
import { buildSystemPrompt } from "../../../persona/prompt/index.js";
import type { AiMessage } from "../../../types.js";
import { parseResponse } from "../../response-parser/index.js";
import { chainGraph } from "../../chain/index.js";
import { incomingQueue } from "../../../lifecycle/incoming-queue.js";
import { chainStateStore } from "../../chain-state-store.js";
import { KIND_CALL_LLM, KIND_DONE, type ChainEvent, type ChainStepResult } from "../types.js";
import { buildChainMessage, resolveStatusLabels } from "./continuation.js";
import { buildAbortResult, buildCompletionResult } from "./final-results.js";
import { loadReadContext } from "./load-reads.js";
import { applyMemoryOps, applyPinUnpin } from "./pin-ops.js";
import { runChainQueries } from "./run-queries.js";

export async function advanceChain(chainId: string, llmResponse: string): Promise<ChainStepResult> {
    const state = chainStateStore.get(chainId);
    if (!state) throw new Error(`chain not found: ${chainId}`);

    const events: ChainEvent[] = [];
    const parsed = parseResponse(llmResponse);
    const parsedRecap = (parsed.recap as Record<string, string> | undefined) ?? undefined;
    const parsedProfileContext = (parsed.profile_context as Record<string, unknown> | null) ?? null;

    const emittedStatus = Array.isArray(parsed.status)
        ? (parsed.status[0] ?? null)
        : typeof parsed.status === "string"
          ? parsed.status
          : null;
    if (emittedStatus && emittedStatus.trim().length > 0) {
        chainStateStore.update(chainId, { nextStatus: emittedStatus });
    }

    applyMemoryOps(parsed, state.siteAccountId, events, state.modeOverrides);
    applyPinUnpin(parsed, state.siteAccountId, events, state.modeOverrides);

    const appendedUserInput = incomingQueue.drain(state.siteAccountId);
    for (const text of appendedUserInput) events.push({ type: "append", payload: { text } });

    const wantsChain = parsed.chain === true || appendedUserInput.length > 0;
    const readIds = parsed.read ?? [];
    const queries = parsed.query ?? [];
    const nextCtx = parsed.next_context ?? [];

    if (chainGraph.isAborted(state.siteAccountId)) {
        const result = buildAbortResult({
            chainId,
            siteAccountId: state.siteAccountId,
            loadedIds: state.loadedIds,
            parsedMessage: parsed.message,
            parsedActions: parsed.actions,
            parsedRecap,
            parsedProfileContext,
            parsedSuggestedUserResponse: parsed.suggested_user_response,
            readIds,
            llmResponse,
            modeOverrides: state.modeOverrides,
        });
        return { kind: KIND_DONE, chainId, result, events };
    }

    const hasActions =
        parsed.actions !== null && parsed.actions !== undefined && Object.keys(parsed.actions).length > 0;
    if ((wantsChain || readIds.length > 0 || queries.length > 0 || nextCtx.length > 0) && !hasActions) {
        resolveStatusLabels(parsed, readIds, queries, events);

        const injections: string[] = [];
        await loadReadContext(
            {
                readIds,
                siteAccountId: state.siteAccountId,
                pageState: state.pageState,
                history: state.history,
            },
            injections,
            events,
        );
        const executedQueries = runChainQueries(queries, state.siteAccountId, injections, events, state.modeOverrides);

        const requested: string[] = [];
        if (readIds.length > 0) requested.push(`read: ${readIds.join(", ")}`);
        if (queries.length > 0) requested.push(`query: ${queries.length} queries`);

        const chainMessage = buildChainMessage(injections, requested, appendedUserInput);
        const newDepth = state.depth + 1;
        if (parsed.message) {
            events.push({ type: "chain", payload: { depth: newDepth, message: parsed.message } });
        }
        events.push({
            type: "continuation",
            payload: { turn: requested.join("; ") || "continuing", recap: parsed.recap },
        });

        chainGraph.addStep(state.siteAccountId, {
            loadedContext: state.loadedIds,
            reads: readIds,
            queries: executedQueries,
            recap: parsedRecap ?? null,
            message: parsed.message ?? "",
            learning: "",
        });

        const newMessages: AiMessage[] = [
            ...state.messages,
            { role: ROLE_ASSISTANT, content: llmResponse },
            { role: ROLE_USER, content: chainMessage },
        ];

        const next = await buildSystemPrompt(
            state.instruction,
            state.mode,
            state.pageState,
            nextCtx,
            state.siteAccountId,
            null,
            null,
            state.chainMode,
            state.history,
            state.profile,
            state.personaOverrides,
            state.modeOverrides,
        );

        chainStateStore.update(chainId, {
            messages: newMessages,
            depth: newDepth,
            loadedIds: next.loadedIds,
            extraContext: nextCtx,
        });

        logger.info(
            `[ai/chain-step] continuation chainId=${chainId} depth=${newDepth} systemLen=${next.system.length}`,
        );

        const continuationStatus = chainStateStore.get(chainId)?.nextStatus;
        if (continuationStatus !== null && continuationStatus !== undefined) {
            events.push({ type: "status", payload: { status: continuationStatus } });
        }
        return {
            kind: KIND_CALL_LLM,
            chainId,
            system: next.system,
            messages: newMessages,
            events,
            nextPollSeconds: parsed.next_poll_seconds,
        };
    }

    const result = buildCompletionResult({
        chainId,
        siteAccountId: state.siteAccountId,
        loadedIds: state.loadedIds,
        parsedMessage: parsed.message,
        parsedActions: parsed.actions,
        parsedChain: parsed.chain === true,
        parsedRecap,
        parsedProfileContext,
        parsedSuggestedUserResponse: parsed.suggested_user_response,
        readIds,
        llmResponse,
        modeOverrides: state.modeOverrides,
    });
    logger.info(`[ai/chain-step] done chainId=${chainId} depth=${state.depth}`);
    return { kind: KIND_DONE, chainId, result, events };
}
