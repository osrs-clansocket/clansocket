import { AsyncLocalStorage } from "node:async_hooks";

export interface AuditContext {
    causedBy?: string;
    requestId: string;
    startMs: number;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();

const MAX_CAUSED_BY_LENGTH = 128;

export function readCausedByHeader(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    if (value.length === 0 || value.length > MAX_CAUSED_BY_LENGTH) return undefined;
    return value;
}

export function getRequestId(): string | undefined {
    return auditContext.getStore()?.requestId;
}

export function getElapsedMs(): number | undefined {
    const ctx = auditContext.getStore();
    if (!ctx) return undefined;
    return Date.now() - ctx.startMs;
}
