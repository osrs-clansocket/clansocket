import { identityClient } from "../../identity/identity-client/index.js";
import { readJsonOrFallback } from "../../fetch-result.js";

export interface ClanAuditEntry {
    id: number;
    ts: number;
    actorSiteAccountId: string | null;
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

export interface AuditPage {
    entries: ClanAuditEntry[];
    hasMore: boolean;
    nextBefore: number | null;
}

export interface AuditListOptions {
    before?: number;
    after?: number;
    limit?: number;
    kindPrefix?: string;
    kindExclude?: string;
    actor?: string;
}

export interface ClanRosterDiff {
    eventType: "member_joined" | "member_left" | "rank_changed";
    memberName: string;
    oldValue: string | null;
    newValue: string | null;
    detectedAt: number;
}

export interface AuditVerifyResult {
    ok: boolean;
    rowsChecked: number;
    breakAtId: number | null;
    breakReason: string | null;
}

export interface AuditRevertResult {
    ok: boolean;
    reason?: string;
    newAuditId?: number;
    cascadeCount?: number;
}

export async function listClanAudit(slug: string, opts: AuditListOptions = {}): Promise<AuditPage> {
    const params = new URLSearchParams();
    if (typeof opts.before === "number") params.set("before", String(opts.before));
    if (typeof opts.after === "number") params.set("after", String(opts.after));
    if (typeof opts.limit === "number") params.set("limit", String(opts.limit));
    if (typeof opts.kindPrefix === "string" && opts.kindPrefix.length > 0) {
        params.set("kindPrefix", opts.kindPrefix);
    }
    if (typeof opts.kindExclude === "string" && opts.kindExclude.length > 0) {
        params.set("kindExclude", opts.kindExclude);
    }
    if (typeof opts.actor === "string" && opts.actor.length > 0) {
        params.set("actor", opts.actor);
    }
    const qs = params.toString();
    const url =
        qs.length > 0
            ? `/api/clans/${encodeURIComponent(slug)}/manage/audit?${qs}`
            : `/api/clans/${encodeURIComponent(slug)}/manage/audit`;
    const res = await identityClient.authedFetch(url);
    return readJsonOrFallback<AuditPage>(res, { entries: [], hasMore: false, nextBefore: null });
}

export async function listRosterDiffs(slug: string, toFingerprint: string): Promise<ClanRosterDiff[]> {
    const res = await identityClient.authedFetch(
        `/api/clans/${encodeURIComponent(slug)}/manage/roster-diffs?to=${encodeURIComponent(toFingerprint)}`,
    );
    const body = await readJsonOrFallback<{ diffs?: ClanRosterDiff[] }>(res, {});
    return body.diffs ?? [];
}

export async function verifyClanAuditChain(slug: string): Promise<AuditVerifyResult> {
    const res = await identityClient.authedFetch(`/api/clans/${encodeURIComponent(slug)}/manage/audit/verify`);
    return readJsonOrFallback<AuditVerifyResult>(res, {
        ok: false,
        rowsChecked: 0,
        breakAtId: null,
        breakReason: "request_failed",
    });
}

export async function revertClanAuditEntry(slug: string, auditId: number): Promise<AuditRevertResult> {
    const res = await identityClient.authedFetch(
        `/api/clans/${encodeURIComponent(slug)}/manage/audit/${encodeURIComponent(String(auditId))}/revert`,
        { method: "POST" },
    );
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, reason: body.error ?? "request_failed" };
    }
    return (await res.json()) as AuditRevertResult;
}

export function openClanAuditStream(slug: string, onEntry: (entry: ClanAuditEntry) => void): () => void {
    const source = new EventSource(`/api/clans/${encodeURIComponent(slug)}/manage/audit/stream`, {
        withCredentials: true,
    });
    source.addEventListener("message", (event) => {
        try {
            const entry = JSON.parse(event.data) as ClanAuditEntry;
            onEntry(entry);
        } catch {
            return;
        }
    });
    return () => source.close();
}
