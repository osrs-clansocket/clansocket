import { getClanVaultDb } from "../../database/core/database-clans.js";
import { getVaultEntryType } from "../registries/vault-entry-type-registry.js";
import { assertActor, recordVaultAudit } from "../recorders/audit-recorder.js";
import type { Actor, VerifyStatus } from "../shared/vault-types.js";

const NOW = (): number => Date.now();

export async function recordVerify(
    clanId: string,
    entry_key: string,
    status: VerifyStatus,
    actor: Actor,
): Promise<void> {
    assertActor(actor);
    const registered = getVaultEntryType(entry_key);
    if (registered === null) return;
    const db = getClanVaultDb(clanId);
    db.prepare("UPDATE vault_entries SET last_verified_at = ?, last_verified_status = ? WHERE entry_key = ?")
        .run(NOW(), status, entry_key);
    recordVaultAudit(clanId, registered.auditActions.verify, entry_key, actor, { status });
}
