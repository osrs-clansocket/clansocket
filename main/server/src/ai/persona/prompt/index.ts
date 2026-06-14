import { chainGraph } from "../../chain/chain/index.js";
import { CHAIN_MODE_CONTINUOUS, CHAIN_MODE_REACTIVE } from "../../chain/chain-modes.js";
import { actionGate } from "../../lifecycle/action-gate.js";
import { pinnedContext } from "../../memory/pinned-context.js";
import { personaDefaults } from "../default-persona/index.js";
import { promptLoader, type DynamicContext } from "../prompt-loader/index.js";
import { resolveHistoryWindow } from "../../prompts/sources/limits.js";
import { formatClientProfile } from "./format-profile.js";
import { formatMetaIndex } from "./format-state.js";
import type { AssembledPrompt, ChainMode, ProfileContext } from "./types.js";

export type { AssembledPrompt, ChainMode, ProfileContext, SessionEntry } from "./types.js";
export { formatStateFull } from "./format-state.js";

const MODE_PROMPT_EXCLUSIONS: Readonly<Record<string, readonly string[]>> = {
    mode_dashboard_actions: ["action", "action-schema", "dom-action-feedback"],
    mode_op_action: ["action", "action-schema", "dom-action-feedback"],
    mode_op_guide: ["guide"],
    mode_op_tracker: ["tracker"],
};

const PERSONALITY_SLOT_BLANKS: Readonly<Record<string, readonly string[]>> = {
    mode_banter: ["ai_shittalk_doctrine"],
    mode_inside_jokes: ["ai_inside_jokes"],
    mode_spontaneous_reactions: ["ai_reaction_calibration"],
};

function applyOverrides(overrides: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(overrides)) {
        out[`__${key}__`] = value;
    }
    return out;
}

function isModeOff(modes: Record<string, boolean>, key: string): boolean {
    return modes[key] === false;
}

function collectExcludedPromptIds(modes: Record<string, boolean>): Set<string> {
    const excluded = new Set<string>();
    for (const [modeKey, ids] of Object.entries(MODE_PROMPT_EXCLUSIONS)) {
        if (isModeOff(modes, modeKey)) {
            for (const id of ids) excluded.add(id);
        }
    }
    return excluded;
}

function applyPersonalityBlanks(modes: Record<string, boolean>): Record<string, string> {
    const blanks: Record<string, string> = {};
    for (const [modeKey, slotKeys] of Object.entries(PERSONALITY_SLOT_BLANKS)) {
        if (isModeOff(modes, modeKey)) {
            for (const slotKey of slotKeys) blanks[`__${slotKey}__`] = "";
        }
    }
    return blanks;
}

export async function buildSystemPrompt(
    instruction: string,
    mode: string,
    pageState: Record<string, unknown> | null,
    extraContextIds: string[],
    siteAccountId: string,
    priorRawResponse: string | null,
    priorUserMessage: string | null,
    chainMode: ChainMode = CHAIN_MODE_REACTIVE,
    history?: { role: "user" | "assistant"; content: string; timestamp?: number }[],
    profile?: ProfileContext | null,
    personaOverrides: Record<string, string> = {},
    modeOverrides: Record<string, boolean> = {},
): Promise<AssembledPrompt> {
    await promptLoader.init();
    const historyWindow = resolveHistoryWindow(personaOverrides);
    const ctx: DynamicContext = { siteAccountId, pageState, history, historyWindow };

    const resolved = promptLoader.resolve(instruction, mode, ctx);
    const extra = promptLoader.resolveByIds(extraContextIds, ctx);
    const allFiles = [...resolved];
    const loadedIds = new Set(resolved.map((f) => f.id));
    for (const f of extra) {
        if (!loadedIds.has(f.id)) {
            allFiles.push(f);
            loadedIds.add(f.id);
        }
    }
    if (chainMode === CHAIN_MODE_CONTINUOUS) {
        const continuousFiles = promptLoader.resolveByIds(["chain-protocol-continuous"], ctx);
        const filtered = allFiles.filter((f) => f.id !== "chain-protocol");
        loadedIds.delete("chain-protocol");
        for (const f of continuousFiles) {
            if (!loadedIds.has(f.id)) {
                filtered.push(f);
                loadedIds.add(f.id);
            }
        }
        allFiles.length = 0;
        allFiles.push(...filtered);
    }

    const excludedIds = collectExcludedPromptIds(modeOverrides);
    if (excludedIds.size > 0) {
        const filtered = allFiles.filter((f) => !excludedIds.has(f.id));
        for (const id of excludedIds) loadedIds.delete(id);
        allFiles.length = 0;
        allFiles.push(...filtered);
    }

    allFiles.sort((a, b) => a.priority - b.priority);

    const nowMs = Date.now();
    const placeholderData: Record<string, string> = {
        __meta_index__: pageState
            ? formatMetaIndex(pageState)
            : 'No page state available. Emit read: ["page-state"] first.',
        __now_utc_ms__: String(nowMs),
        __now_iso__: new Date(nowMs).toISOString(),
        ...personaDefaults,
        ...applyOverrides(personaOverrides),
        ...applyPersonalityBlanks(modeOverrides),
    };

    const sections: string[] = [];
    for (const file of allFiles) {
        const filled = promptLoader.fillPlaceholders(file.content, placeholderData);
        sections.push(`[PROMPT: ${file.id}]\n${filled}`);
    }

    if (profile) {
        sections.push(
            `[PROMPT: user-profile]\n## User Profile (persisted in the client browser — you emit this back each turn in \`profile_context\`)\n\n${formatClientProfile(profile, historyWindow)}`,
        );
    }

    const pinned = pinnedContext.list(siteAccountId);
    const pinnedContent = pinnedContext.format(siteAccountId);
    if (pinnedContent) {
        sections.push(
            `[PROMPT: pinned-context]\n## Active Context (pinned — persists across turns, use \`unpin\` to remove)\nPinned IDs: [${pinned.join(", ")}]\n\n${pinnedContent}`,
        );
    }

    sections.push(`[PROMPT: action-cooldowns]\n## Action Cooldowns\n${actionGate.formatCooldowns(siteAccountId)}`);

    const chainJournal = chainGraph.formatActive(siteAccountId);
    if (chainJournal) {
        sections.push(
            `[PROMPT: chain-journal]\n## Chain So Far (append-only journal of every turn completed in THIS chain — read before composing this turn so nothing you already established gets lost or repeated)\n${chainJournal}`,
        );
    }

    if (priorRawResponse) {
        const parts: string[] = [
            "[PROMPT: previous-turn]",
            "## Previous Turn (your own state from last turn — read before deriving the new one)",
        ];
        if (priorUserMessage) {
            parts.push("**User message that prompted the response below:**", priorUserMessage);
        }
        parts.push("**Your raw JSON response:**", "```json", priorRawResponse, "```");
        sections.push(parts.join("\n"));
    }

    sections.push("--- END OF SYSTEM PROMPT ---");

    return {
        system: sections.join("\n\n"),
        loadedIds: Array.from(loadedIds),
    };
}
