import { ClanAuditActions } from "../clan-audit-actions.js";

export const REVERTABLE_ACTIONS = new Set<string>([
    ClanAuditActions.BrandingUpdated,
    ClanAuditActions.ManagerGranted,
    ClanAuditActions.ManagerRevoked,
    ClanAuditActions.ClaimTransferred,
    ClanAuditActions.WhitelistAdded,
]);

export function isRevertable(action: string): boolean {
    return REVERTABLE_ACTIONS.has(action);
}

export interface SourceEntry {
    id: number;
    actor_site_account_id: string | null;
    action: string;
    target_id: string | null;
    payload_json: string | null;
}

export interface RevertResult {
    ok: boolean;
    reason?: string;
    newAuditId?: number;
    cascadeCount?: number;
}
