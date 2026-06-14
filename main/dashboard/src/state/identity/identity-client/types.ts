export const DISPLAY_NAME_MAX_LEN = 64;
export const RSN_MAX_LEN = 12;

export interface SiteAccount {
    id: string;
    provider: "github" | "discord" | "passkey";
    displayName: string | null;
    avatarUrl: string | null;
}

export interface OkResult<T = unknown> {
    ok: boolean;
    result?: T;
    error?: string;
}

export interface LinkedProvider {
    provider: "github" | "discord";
    displayName: string | null;
    avatarUrl: string | null;
    linkedAt: number;
}

export interface VerifiedRsn {
    accountHash: string;
    rsn: string;
    source: "plugin" | "clan_claim" | "site";
    verifiedAt: number;
    displaced: boolean;
    displacementDeadlineAt: number | null;
    rank: string | null;
}

export interface PendingRsnRequest {
    id: number;
    targetRsn: string;
    createdAt: number;
    expiresAt: number;
}

export interface PendingClaimConsent {
    id: number;
    targetRsn: string;
    declaredClanName: string;
    createdAt: number;
    expiresAt: number;
}

export interface Identification {
    displayName: string | null;
    verifiedRsns: VerifiedRsn[];
    pendingRequests: PendingRsnRequest[];
    pendingClaimConsents: PendingClaimConsent[];
}
