import logger from "@clansocket/logger";

type TriggerEmit<TPayload = unknown> = (payload: TPayload) => void;

const SUBSCRIBERS: Map<string, Set<TriggerEmit>> = new Map();

function safeEmit<TPayload>(emit: TriggerEmit<TPayload>, payload: TPayload): void {
    try {
        emit(payload);
    } catch (err: any) {
        logger.warn(`Trigger subscriber threw: ${err.message}`);
    }
}

export function addSubscriber<TPayload>(triggerId: string, emit: TriggerEmit<TPayload>): () => void {
    let set = SUBSCRIBERS.get(triggerId);
    if (!set) {
        set = new Set();
        SUBSCRIBERS.set(triggerId, set);
    }
    set.add(emit as TriggerEmit);
    return () => {
        const current = SUBSCRIBERS.get(triggerId);
        if (current) current.delete(emit as TriggerEmit);
    };
}

export function fire<TPayload>(triggerId: string, payload: TPayload): void {
    const set = SUBSCRIBERS.get(triggerId);
    if (!set) return;
    for (const emit of set) safeEmit(emit, payload);
}
