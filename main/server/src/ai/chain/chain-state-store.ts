import { randomUUID } from "node:crypto";
import type { AiMessage } from "../types.js";
import type { ChainMode } from "../persona/prompt/index.js";
import { MS_PER_MINUTE } from "../../shared/time.js";
import { chainGraph } from "./chain/index.js";
import { incomingQueue } from "../lifecycle/incoming-queue.js";

const TTL_MINUTES = 5;
const TTL_MS = TTL_MINUTES * MS_PER_MINUTE;

export interface HistoryEntry {
    role: "user" | "assistant";
    content: string;
    timestamp?: number;
}

export interface PriorTurn {
    raw: string;
    userMessage: string;
}

export interface SessionEntry {
    turn: number;
    they: string;
    i: string;
    learned?: string;
    fix?: string;
    failure?: string;
}

export interface ProfileContext {
    identity: Record<string, string>;
    session: SessionEntry[];
    focus: string | null;
}

export interface ChainState {
    chainId: string;
    siteAccountId: string;
    instruction: string;
    mode: string;
    chainMode: ChainMode;
    pageState: Record<string, unknown> | null;
    history: HistoryEntry[];
    profile: ProfileContext | null;
    personaOverrides: Record<string, string>;
    modeOverrides: Record<string, boolean>;
    extraContext: string[];
    depth: number;
    messages: AiMessage[];
    loadedIds: string[];
    lastTurn: PriorTurn | null;
    nextStatus: string | null;
    createdAt: number;
    lastSeenAt: number;
}

const chains = new Map<string, ChainState>();

function sweep(now: number): void {
    for (const [id, state] of chains) {
        if (now - state.lastSeenAt > TTL_MS) {
            chains.delete(id);
            chainGraph.discard(state.siteAccountId);
            incomingQueue.clear(state.siteAccountId);
        }
    }
}

export interface ChainStateSeed {
    siteAccountId: string;
    instruction: string;
    mode: string;
    chainMode: ChainMode;
    pageState: Record<string, unknown> | null;
    history: HistoryEntry[];
    profile: ProfileContext | null;
    personaOverrides: Record<string, string>;
    modeOverrides: Record<string, boolean>;
    extraContext: string[];
    lastTurn: PriorTurn | null;
}

export const chainStateStore = {
    create(seed: ChainStateSeed): ChainState {
        const now = Date.now();
        sweep(now);
        const state: ChainState = {
            chainId: `chain-${randomUUID()}`,
            siteAccountId: seed.siteAccountId,
            instruction: seed.instruction,
            mode: seed.mode,
            chainMode: seed.chainMode,
            pageState: seed.pageState,
            history: seed.history,
            profile: seed.profile,
            personaOverrides: seed.personaOverrides,
            modeOverrides: seed.modeOverrides,
            extraContext: seed.extraContext,
            depth: 0,
            messages: [],
            loadedIds: [],
            lastTurn: seed.lastTurn,
            nextStatus: null,
            createdAt: now,
            lastSeenAt: now,
        };
        chains.set(state.chainId, state);
        return state;
    },

    get(chainId: string): ChainState | null {
        const now = Date.now();
        sweep(now);
        const state = chains.get(chainId);
        if (!state) return null;
        state.lastSeenAt = now;
        return state;
    },

    update(chainId: string, patch: Partial<ChainState>): ChainState | null {
        const state = this.get(chainId);
        if (state) {
            Object.assign(state, patch);
            state.lastSeenAt = Date.now();
        }
        return state;
    },

    delete(chainId: string): void {
        chains.delete(chainId);
    },

    size(): number {
        return chains.size;
    },
};
