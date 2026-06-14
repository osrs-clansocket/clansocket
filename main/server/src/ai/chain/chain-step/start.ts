import logger from "@clansocket/logger";
import { ROLE_USER } from "../../persona/role-constants.js";
import { buildSystemPrompt } from "../../persona/prompt/index.js";
import type { AiMessage } from "../../types.js";
import { chainGraph } from "../chain/index.js";
import type { ChainState } from "../chain-state-store.js";
import { chainStateStore } from "../chain-state-store.js";
import { type ChainEvent, type ChainStepCallLlm, KIND_CALL_LLM } from "./types.js";
import { pickDefaultStatus } from "./statuses.js";

export async function startChain(state: ChainState): Promise<ChainStepCallLlm> {
    const { system, loadedIds } = await buildSystemPrompt(
        state.instruction,
        state.mode,
        state.pageState,
        state.extraContext,
        state.siteAccountId,
        state.lastTurn?.raw ?? null,
        state.lastTurn?.userMessage ?? null,
        state.chainMode,
        state.history,
        state.profile,
        state.personaOverrides,
        state.modeOverrides,
    );

    const userContent = `USER MESSAGE= "${state.instruction}"`;
    const messages: AiMessage[] = [{ role: ROLE_USER, content: userContent }];

    chainStateStore.update(state.chainId, {
        loadedIds,
        messages,
    });

    chainGraph.start(state.siteAccountId, state.instruction, state.mode);

    const statusEvent: ChainEvent = {
        type: "status",
        payload: { status: state.nextStatus ?? pickDefaultStatus() },
    };

    logger.info(`[ai/chain-step] start chainId=${state.chainId} depth=0 systemLen=${system.length}`);

    return {
        kind: KIND_CALL_LLM,
        chainId: state.chainId,
        system,
        messages,
        events: [statusEvent],
        nextPollSeconds: null,
    };
}
