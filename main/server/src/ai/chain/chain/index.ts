import { formatChain } from "./format.js";
import { markCompleted, persistStep, trimHistory } from "./persistence.js";
import type { Chain, ChainStep } from "./types.js";

export type { Chain, ChainStep, ChainStepQuery } from "./types.js";

const activeChains = new Map<string, Chain>();
const abortedChains = new Set<string>();

export const chainGraph = {
    start(siteAccountId: string, instruction: string, mode: string): Chain {
        const chain: Chain = {
            id: `chain-${Date.now()}`,
            instruction,
            mode,
            startedAt: Date.now(),
            completedAt: null,
            steps: [],
            totalApplied: 0,
            totalRejected: 0,
        };
        activeChains.set(siteAccountId, chain);
        return chain;
    },

    addStep(siteAccountId: string, entry: Omit<ChainStep, "step">): void {
        const chain = activeChains.get(siteAccountId);
        if (!chain) return;
        const step: ChainStep = { step: chain.steps.length + 1, ...entry };
        chain.steps.push(step);
        persistStep(siteAccountId, chain, step);
    },

    complete(siteAccountId: string): Chain | null {
        const chain = activeChains.get(siteAccountId);
        if (!chain) return null;
        chain.completedAt = Date.now();
        markCompleted(siteAccountId, chain.id, chain.completedAt);
        trimHistory(siteAccountId);
        activeChains.delete(siteAccountId);
        abortedChains.delete(siteAccountId);
        return chain;
    },

    discard(siteAccountId: string): void {
        activeChains.delete(siteAccountId);
        abortedChains.delete(siteAccountId);
    },

    abort(siteAccountId: string): void {
        if (activeChains.has(siteAccountId)) abortedChains.add(siteAccountId);
    },

    isAborted(siteAccountId: string): boolean {
        return abortedChains.has(siteAccountId);
    },

    active(siteAccountId: string): Chain | null {
        return activeChains.get(siteAccountId) ?? null;
    },

    formatActive(siteAccountId: string): string {
        const chain = activeChains.get(siteAccountId);
        if (!chain) return "";
        return formatChain(chain);
    },
};
