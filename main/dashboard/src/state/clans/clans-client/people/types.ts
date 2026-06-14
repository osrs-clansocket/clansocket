export type ClaimSubmitResult =
    | {
          ok: true;
          status: "awaiting-plugin-consent";
          requestId: number;
          expiresAt: number;
          liveSessions: number;
          clanName: string;
          message?: string;
      }
    | {
          ok: false;
          reason: "already_pending" | "bad-payload" | "no-live-plugin" | "no-clan" | "generic";
          requestId?: number;
          expiresAt?: number;
          clanName?: string;
          message?: string;
      };

export type ManagerSubmitResult =
    | { ok: true; alreadyManager: true; slug?: string; clanId?: string }
    | {
          ok: true;
          alreadyManager?: false;
          status: "granted";
          slug: string;
          clanId: string;
          rsn: string;
          rank: string;
          message: string;
      }
    | {
          ok: true;
          alreadyManager?: false;
          status: "awaiting-owner-approval";
          requestId: string;
          slug: string;
          clanId: string;
          next?: string;
      }
    | {
          ok: false;
          reason: "bad_payload" | "clan_not_found" | "generic";
          message?: string;
      };

export type ManagerRequestSource = "site" | "plugin";

export interface ManagerRequest {
    id: string;
    siteAccountId: string;
    siteAccountDisplay: string;
    siteAccountProvider: string | null;
    declaredRsn: string;
    declaredAccountHash: string | null;
    pluginVerified: boolean;
    source: ManagerRequestSource;
    requestedAt: number;
}

export interface ClanManagerRow {
    siteAccountId: string;
    siteAccountDisplay: string;
    siteAccountProvider: string | null;
    boundAccountHashes: string[];
    role: string;
    grantedVia: string;
    grantedAt: number;
}
