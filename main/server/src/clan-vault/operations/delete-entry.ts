import { getClanVaultDb } from "../../database/core/database-clans.js";
import { getVaultEntryType } from "../registries/vault-entry-type-registry.js";
import { assertActor, recordVaultAudit } from "../recorders/audit-recorder.js";
import type { Actor } from "../shared/vault-types.js";

export async function deleteVaultEntry(clanId: string, entry_key: string, actor: Actor): Promise<void> {
    assertActor(actor);
    const registered = getVaultEntryType(entry_key);
    if (registered === null) return;
    await registered.onDelete(clanId);
    const db = getClanVaultDb(clanId);
    db.prepare("DELETE FROM vault_entries WHERE entry_key = ?").run(entry_key);
    recordVaultAudit(clanId, registered.auditActions.delete, entry_key, actor);
}
