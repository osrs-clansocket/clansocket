import logger from "@clansocket/logger";
import { processClanWomQueueOnce } from "./wom-queue-processor.js";

const TIMER_LOOKUP = new Map<string, NodeJS.Timeout>();

function clearScheduledWake(clanId: string): void {
    const existing = TIMER_LOOKUP.get(clanId);
    if (!existing) return;
    clearTimeout(existing);
    TIMER_LOOKUP.delete(clanId);
}

function fireProcessor(clanId: string): void {
    TIMER_LOOKUP.delete(clanId);
    processClanWomQueueOnce(clanId).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`[wom-dispatcher] processing clan ${clanId} threw: ${message}`);
    });
}

export function scheduleWomWakeForClan(clanId: string, dueAtMs: number): void {
    clearScheduledWake(clanId);
    const delayMs = Math.max(0, dueAtMs - Date.now());
    const timer = setTimeout(() => fireProcessor(clanId), delayMs);
    TIMER_LOOKUP.set(clanId, timer);
}

export function pokeWomDispatcher(clanId: string): void {
    scheduleWomWakeForClan(clanId, Date.now());
}

export function cancelWomDispatcher(clanId: string): void {
    clearScheduledWake(clanId);
}
