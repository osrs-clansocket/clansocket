import {
    consentClient,
    type ConsentRecord,
    type ConsentStatus,
} from "../../../../state/identity/consent/consent-client.js";
import { identityClient } from "../../../../state/identity/identity-client/index.js";
import {
    DAYS_PER_MONTH,
    DAYS_PER_YEAR,
    HOURS_PER_DAY,
    MINUTES_PER_HOUR,
    MONTHS_PER_YEAR,
    MS_PER_DAY,
    MS_PER_HOUR,
    MS_PER_MINUTE,
    MS_PER_SECOND,
} from "../../../../state/time-units.js";

export { setStatus } from "../../status-line.js";

export const STATUS_LABELS: Record<ConsentStatus, string> = {
    pending: "pending",
    confirmed: "confirmed",
    rejected: "rejected",
    expired: "expired",
    cancelled: "cancelled",
};

export const KIND_LABELS: Record<string, string> = {
    rsn: "RSN verify",
    claim: "clan claim",
    manager: "manager request",
};

const RELATIVE_AGE_UNITS: { divisor: number; max: number; suffix: string }[] = [
    { divisor: MS_PER_MINUTE, max: MINUTES_PER_HOUR, suffix: "m" },
    { divisor: MS_PER_HOUR, max: HOURS_PER_DAY, suffix: "h" },
    { divisor: MS_PER_DAY, max: DAYS_PER_MONTH, suffix: "d" },
    { divisor: MS_PER_DAY * DAYS_PER_MONTH, max: MONTHS_PER_YEAR, suffix: "mo" },
    { divisor: MS_PER_DAY * DAYS_PER_YEAR, max: Infinity, suffix: "y" },
];

export function formatRelativeAge(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < MS_PER_MINUTE) return "just now";
    for (const unit of RELATIVE_AGE_UNITS) {
        const v = Math.floor(diff / unit.divisor);
        if (v < unit.max) return `${v}${unit.suffix} ago`;
    }
    return "just now";
}

export function formatRemaining(expiresAt: number, now: number): string {
    const msLeft = Math.max(0, expiresAt - now);
    const m = Math.floor(msLeft / MS_PER_MINUTE);
    const s = Math.floor((msLeft % MS_PER_MINUTE) / MS_PER_SECOND);
    return `${m}m ${s}s left`;
}

export function primaryText(r: ConsentRecord): string {
    const parts: string[] = [KIND_LABELS[r.kind] ?? r.kind];
    if (r.targetRsn) parts.push(`'${r.targetRsn}'`);
    if (r.declaredClanName) parts.push(`→ ${r.declaredClanName}`);
    return parts.join(" ");
}

export async function cancelConsent(r: ConsentRecord): Promise<{ ok: true } | { ok: false; error: string }> {
    if (r.kind === "rsn") {
        const result = await identityClient.cancelRsnRequest(r.id);
        return result.ok ? { ok: true } : { ok: false, error: result.error ?? "error" };
    }
    return consentClient.cancelNonRsnConsent(r.id);
}
