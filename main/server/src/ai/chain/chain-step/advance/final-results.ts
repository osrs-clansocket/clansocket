import { chainGraph } from "../../chain/index.js";
import { chainStateStore } from "../../chain-state-store.js";
import { pinnedContext } from "../../../memory/pinned-context.js";
import type { Actions } from "../../../types.js";
import { extractDisplayText } from "../helpers.js";
import type { FinalResult } from "../types.js";

function isOff(modes: Record<string, boolean> | undefined, key: string): boolean {
    return modes !== undefined && modes[key] === false;
}

function applyModeGates(
    input: {
        parsedActions: Actions | null;
        parsedProfileContext: Record<string, unknown> | null;
        parsedSuggestedUserResponse: string | null;
    },
    modes: Record<string, boolean> | undefined,
): {
    actions: Actions | null;
    profileContext: Record<string, unknown> | null;
    suggestedUserResponse: string | null;
} {
    return {
        actions: isOff(modes, "mode_dashboard_actions") || isOff(modes, "mode_op_action") ? null : input.parsedActions,
        profileContext: isOff(modes, "mode_profile_updates") ? null : input.parsedProfileContext,
        suggestedUserResponse: isOff(modes, "mode_suggested_replies") ? null : input.parsedSuggestedUserResponse,
    };
}

interface AbortInput {
    chainId: string;
    siteAccountId: string;
    loadedIds: string[];
    parsedMessage: string | null | undefined;
    parsedActions: Actions | null;
    parsedRecap: Record<string, string> | undefined;
    parsedProfileContext: Record<string, unknown> | null;
    parsedSuggestedUserResponse: string | null;
    readIds: string[];
    llmResponse: string;
    modeOverrides?: Record<string, boolean>;
}

export function buildAbortResult(input: AbortInput): FinalResult {
    chainGraph.addStep(input.siteAccountId, {
        loadedContext: input.loadedIds,
        reads: input.readIds,
        queries: [],
        recap: input.parsedRecap ?? null,
        message: input.parsedMessage ?? "",
        learning: "aborted",
    });
    const gated = applyModeGates(input, input.modeOverrides);
    const result: FinalResult = {
        message: input.parsedMessage ?? extractDisplayText(input.llmResponse),
        raw: input.llmResponse,
        actions: gated.actions,
        chainId: input.chainId,
        chainContinues: false,
        loadedIds: input.loadedIds,
        pinnedContext: pinnedContext.list(input.siteAccountId),
        profileContext: gated.profileContext,
        suggestedUserResponse: gated.suggestedUserResponse,
    };
    chainGraph.complete(input.siteAccountId);
    chainStateStore.delete(input.chainId);
    return result;
}

interface CompletionInput {
    chainId: string;
    siteAccountId: string;
    loadedIds: string[];
    parsedMessage: string | null | undefined;
    parsedActions: Actions | null;
    parsedChain: boolean;
    parsedRecap: Record<string, string> | undefined;
    parsedProfileContext: Record<string, unknown> | null;
    parsedSuggestedUserResponse: string | null;
    readIds: string[];
    llmResponse: string;
    modeOverrides?: Record<string, boolean>;
}

export function buildCompletionResult(input: CompletionInput): FinalResult {
    chainGraph.addStep(input.siteAccountId, {
        loadedContext: input.loadedIds,
        reads: input.readIds,
        queries: [],
        recap: input.parsedRecap ?? null,
        message: input.parsedMessage ?? "",
        learning: "",
    });
    const gated = applyModeGates(input, input.modeOverrides);
    const hasActions = gated.actions !== null && Object.keys(gated.actions).length > 0;
    const chainContinues = input.parsedChain === true && hasActions;
    const result: FinalResult = {
        message: input.parsedMessage ?? extractDisplayText(input.llmResponse),
        raw: input.llmResponse,
        actions: gated.actions,
        chainId: input.chainId,
        chainContinues,
        loadedIds: input.loadedIds,
        pinnedContext: pinnedContext.list(input.siteAccountId),
        profileContext: gated.profileContext,
        suggestedUserResponse: gated.suggestedUserResponse,
    };
    chainGraph.complete(input.siteAccountId);
    chainStateStore.delete(input.chainId);
    return result;
}
