import type { Actions } from "../../types.js";

export interface DbQuery {
    db: string;
    sql: string;
    clan?: string;
}

export interface ParsedResponse {
    actions: Actions | null;
    message: string | null;
    status: string | string[] | null;
    suggested_user_response: string | null;
    next_context: string[];
    chain: boolean;
    read: string[];
    query: DbQuery[];
    pin: string[];
    unpin: string[];
    profile_context: Record<string, unknown> | null;
    memory: Record<string, unknown>[] | null;
    recap: Record<string, unknown> | null;
    next_poll_seconds: number | null;
}

const NEXT_POLL_MIN = 15;
const NEXT_POLL_MAX = 120;

export function clampPollSeconds(raw: unknown): number | null {
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    return Math.max(NEXT_POLL_MIN, Math.min(NEXT_POLL_MAX, Math.floor(raw)));
}

export function normalizeQuery(raw: unknown): DbQuery | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as { db?: unknown; sql?: unknown; clan?: unknown };
    if (typeof r.db !== "string" || typeof r.sql !== "string") return null;
    const out: DbQuery = { db: r.db, sql: r.sql };
    if (typeof r.clan === "string" && r.clan.length > 0) out.clan = r.clan;
    return out;
}
