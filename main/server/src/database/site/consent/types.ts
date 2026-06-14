import { CLAIM_CONSENT_TTL_MS, RSN_VERIFY_TTL_MS } from "../rsn/state.js";

export type ConsentKind = "rsn" | "claim";
export type ConsentStatus = "pending" | "confirmed" | "rejected" | "expired" | "cancelled";

export const TTL_BY_KIND: Record<ConsentKind, number> = {
    rsn: RSN_VERIFY_TTL_MS,
    claim: CLAIM_CONSENT_TTL_MS,
};

export const CONSENT_COLUMNS =
    "id, kind, requesting_site_account_id, target_account_hash, target_rsn, declared_clan_name, declared_clan_slug, declared_clan_id, status, created_at, expires_at, resolved_at";

export interface ConsentRequestRow {
    id: number;
    kind: ConsentKind;
    requesting_site_account_id: string;
    target_account_hash: string | null;
    target_rsn: string;
    declared_clan_name: string | null;
    declared_clan_slug: string | null;
    declared_clan_id: string | null;
    status: ConsentStatus;
    created_at: number;
    expires_at: number;
    resolved_at: number | null;
}

export interface CreateConsentArgs {
    kind: ConsentKind;
    requestingSiteAccountId: string;
    targetAccountHash: string | null;
    targetRsn: string;
    declaredClanName?: string | null;
    declaredClanSlug?: string | null;
    declaredClanId?: string | null;
    ttlMs?: number;
}
