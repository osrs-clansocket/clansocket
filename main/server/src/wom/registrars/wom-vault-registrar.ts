import { registerVaultEntryType } from "../../clan-vault/index.js";
import { ClanAuditActions } from "../../database/clans/audit/clan-audit-actions.js";
import { onWomCredentialsDeleted } from "../handlers/wom-deleted-handler.js";
import type { WomPayload } from "../types/wom-types.js";
import { validateWomPayload } from "../validators/wom-payload-validator.js";
import { verifyWomCredentials } from "../verifiers/wom-credentials-verifier.js";

const ENTRY_KEY_WOM = "wom";
const ENTRY_TYPE_WOM = "wom";
const SCHEMA_VERSION_V1 = 1;

export function registerWomVaultEntry(): void {
    registerVaultEntryType<WomPayload>({
        entry_key: ENTRY_KEY_WOM,
        entry_type: ENTRY_TYPE_WOM,
        schema_version: SCHEMA_VERSION_V1,
        validate: validateWomPayload,
        verify: async (payload) => (await verifyWomCredentials(payload)).status,
        onDelete: onWomCredentialsDeleted,
        auditActions: {
            read: ClanAuditActions.VaultWomRead,
            write: ClanAuditActions.VaultWomWrite,
            delete: ClanAuditActions.VaultWomDelete,
            verify: ClanAuditActions.VaultWomVerify,
        },
    });
}
