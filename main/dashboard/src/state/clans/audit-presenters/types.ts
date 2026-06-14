import type { ClanAuditEntry } from "../clans-client/index.js";

export interface PresentedEntry {
    title: string;
    detail: string;
    icon: string;
    semantic: "read" | "write" | "destructive" | "chain" | "system";
    hasExpansion: boolean;
}

export type Presenter = (entry: ClanAuditEntry) => PresentedEntry;

const SHORT_ID_LEN = 8;

export function pload(entry: ClanAuditEntry, key: string): string | null {
    const v = entry.payload?.[key];
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    return null;
}

export function ploadNum(entry: ClanAuditEntry, key: string): number | null {
    const v = entry.payload?.[key];
    return typeof v === "number" ? v : null;
}

export function shortId(id: string | null): string {
    if (id === null) return "";
    return id.length > SHORT_ID_LEN ? `${id.slice(0, SHORT_ID_LEN)}…` : id;
}

export function withCausedBy(entry: ClanAuditEntry, result: PresentedEntry): PresentedEntry {
    const causedBy = entry.payload?.causedBy;
    if (typeof causedBy !== "string" || causedBy.length === 0) return result;
    const parts = causedBy.split(".");
    const seqLabel = parts.length === 2 && parts[1]!.length > 0 ? `#${parts[1]}` : "";
    const marker = seqLabel.length > 0 ? `↳ caused by client ${seqLabel}` : "↳ caused by client";
    return {
        ...result,
        detail: result.detail.length > 0 ? `${result.detail} · ${marker}` : marker,
    };
}
