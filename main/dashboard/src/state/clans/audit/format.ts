import type { ClanAuditEntry, ClanRosterDiff } from "../clans-client/index.js";
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from "../../time-units.js";

export { MS_PER_HOUR as HOUR_MS, MS_PER_DAY as DAY_MS };

const DAYS_PER_MONTH = 30;
const MS_PER_MONTH = DAYS_PER_MONTH * MS_PER_DAY;
const ACTOR_ID_DISPLAY_LEN = 8;

export function fmtRelative(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 0) return "just now";
    if (diff < MS_PER_MINUTE) return `${Math.floor(diff / MS_PER_SECOND)}s ago`;
    if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
    if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
    if (diff < MS_PER_MONTH) return `${Math.floor(diff / MS_PER_DAY)}d ago`;
    return `${Math.floor(diff / MS_PER_MONTH)}mo ago`;
}

export function fmtActor(entry: ClanAuditEntry): string {
    if (entry.actorDisplay !== null && entry.actorDisplay.length > 0) return entry.actorDisplay;
    if (entry.actorSiteAccountId === null) return "system";
    const id = entry.actorSiteAccountId;
    return id.length > ACTOR_ID_DISPLAY_LEN ? `${id.slice(0, ACTOR_ID_DISPLAY_LEN)}…` : id;
}

export function fmtDiffEvent(diff: ClanRosterDiff): string {
    if (diff.eventType === "member_joined") {
        const rank = diff.newValue ?? "?";
        return `joined as ${rank}`;
    }
    if (diff.eventType === "member_left") {
        const rank = diff.oldValue ?? "?";
        return `left (was ${rank})`;
    }
    return `rank ${diff.oldValue ?? "?"} → ${diff.newValue ?? "?"}`;
}

export function fmtBeforeAfterValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v);
}

export function fmtSpan(earliestTs: number | null, latestTs: number | null): string {
    if (earliestTs === null || latestTs === null) return "";
    const spanMs = latestTs - earliestTs;
    if (spanMs < MS_PER_SECOND) return "under a second";
    if (spanMs < MS_PER_MINUTE) return `${Math.round(spanMs / MS_PER_SECOND)}s`;
    if (spanMs < MS_PER_HOUR) return `${Math.round(spanMs / MS_PER_MINUTE)}m`;
    if (spanMs < MS_PER_DAY) return `${Math.round(spanMs / MS_PER_HOUR)}h`;
    return `${Math.round(spanMs / MS_PER_DAY)}d`;
}

export function tallySemantic(action: string): "read" | "write" | "destructive" | "chain" | "system" {
    if (action.startsWith("client:")) return "chain";
    if (action.startsWith("server:read.")) return "read";
    if (
        action === "server:manager.revoked" ||
        action === "server:whitelist.removed" ||
        action === "server:manager.request.denied" ||
        action === "server:auth.rejected" ||
        action === "server:claim.rejected" ||
        action === "server:claim.consent_rejected"
    ) {
        return "destructive";
    }
    if (action.startsWith("server:")) return "write";
    return "system";
}
