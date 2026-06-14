export type ActorKind = "user" | "ai";

export interface ClanAuditEntry {
    id: number;
    ts: number;
    actorSiteAccountId: string | null;
    actorKind: ActorKind;
    actorDisplay: string | null;
    action: string;
    source: string;
    schemaVersion: number;
    targetType: string | null;
    targetId: string | null;
    payload: Record<string, unknown> | null;
    requestId: string | null;
    elapsedMs: number | null;
}

export interface AuditRow {
    id: number;
    ts: number;
    actor_site_account_id: string | null;
    actor_kind: string | null;
    action: string;
    source: string;
    schema_version: number;
    target_type: string | null;
    target_id: string | null;
    payload_json: string | null;
    request_id: string | null;
    elapsed_ms: number | null;
}

export interface ListClanAuditOptions {
    before?: number;
    after?: number;
    limit?: number;
    kindPrefix?: string;
    kindExclude?: string;
    actorSiteAccountId?: string;
}

export interface ListClanAuditResult {
    entries: ClanAuditEntry[];
    hasMore: boolean;
    nextBefore: number | null;
}

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 150;
