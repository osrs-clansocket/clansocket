export type WomNameChangeStatus = "pending" | "approved" | "denied" | "unknown";

interface WomNameChangeRaw {
    id?: number;
    playerId?: number;
    oldName?: string;
    newName?: string;
    status?: string;
    resolvedAt?: string | null;
}

export type WomGroupNameChangesResponse = readonly WomNameChangeRaw[];

export interface MappedNameChange {
    womChangeId: number;
    womPlayerId: number;
    oldRsn: string;
    newRsn: string;
    status: WomNameChangeStatus;
    resolvedAtMs: number | null;
}

const STATUS_LOOKUP: Record<string, WomNameChangeStatus> = {
    pending: "pending",
    approved: "approved",
    denied: "denied",
};

function mapStatus(raw: string | undefined): WomNameChangeStatus {
    if (typeof raw !== "string") return "unknown";
    return STATUS_LOOKUP[raw.toLowerCase()] ?? "unknown";
}

function parseIsoMs(value: string | null | undefined): number | null {
    if (typeof value !== "string" || value.length === 0) return null;
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return null;
    return ms;
}

export function mapGroupNameChanges(response: WomGroupNameChangesResponse): MappedNameChange[] {
    const out: MappedNameChange[] = [];
    for (const entry of response) {
        if (typeof entry.id !== "number") continue;
        if (typeof entry.playerId !== "number") continue;
        if (typeof entry.oldName !== "string" || typeof entry.newName !== "string") continue;
        out.push({
            womChangeId: entry.id,
            womPlayerId: entry.playerId,
            oldRsn: entry.oldName,
            newRsn: entry.newName,
            status: mapStatus(entry.status),
            resolvedAtMs: parseIsoMs(entry.resolvedAt),
        });
    }
    return out;
}
