const queues = new Map<string, string[]>();

export const incomingQueue = {
    enqueue(siteAccountId: string, text: string): number {
        const q = queues.get(siteAccountId) ?? [];
        q.push(text);
        queues.set(siteAccountId, q);
        return q.length;
    },

    drain(siteAccountId: string): string[] {
        const q = queues.get(siteAccountId) ?? [];
        if (q.length === 0) return [];
        queues.delete(siteAccountId);
        return q;
    },

    peek(siteAccountId: string): number {
        return queues.get(siteAccountId)?.length ?? 0;
    },

    clear(siteAccountId: string): void {
        queues.delete(siteAccountId);
    },
};
