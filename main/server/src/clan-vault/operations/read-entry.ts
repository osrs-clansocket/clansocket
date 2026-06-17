import { decryptToken } from "../../crypto/aes-gcm-decrypter.js";
import { getClanVaultMasterKey } from "../../crypto/clan-vault-master-key-loader.js";
import { getClanVaultDb } from "../../database/core/database-clans.js";
import { getVaultEntryType } from "../registries/vault-entry-type-registry.js";
import { assertActor, recordVaultAudit } from "../recorders/audit-recorder.js";
import type { Actor, PayloadValidator, VaultRow } from "../shared/vault-types.js";

const NOW = (): number => Date.now();

export async function readVaultEntry<T>(
    clanId: string,
    entry_key: string,
    actor: Actor,
    validate: PayloadValidator<T>,
): Promise<T | null> {
    assertActor(actor);
    const registered = getVaultEntryType(entry_key);
    if (registered === null) return null;
    const db = getClanVaultDb(clanId);
    const row = db.prepare("SELECT * FROM vault_entries WHERE entry_key = ?").get(entry_key) as VaultRow | undefined;
    if (row === undefined) {
        recordVaultAudit(clanId, registered.auditActions.read, entry_key, actor, { hit: false });
        return null;
    }
    let plaintext: string;
    try {
        plaintext = decryptToken(row.ciphertext_b64, row.iv_b64, getClanVaultMasterKey());
    } catch {
        recordVaultAudit(clanId, registered.auditActions.read, entry_key, actor, {
            hit: true,
            reason: "decrypt-failed",
        });
        return null;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(plaintext);
    } catch {
        recordVaultAudit(clanId, registered.auditActions.read, entry_key, actor, { hit: true, reason: "parse-failed" });
        return null;
    }
    if (!validate(parsed)) {
        recordVaultAudit(clanId, registered.auditActions.read, entry_key, actor, {
            hit: true,
            reason: "schema-violation",
        });
        return null;
    }
    db.prepare("UPDATE vault_entries SET last_used_at = ? WHERE entry_key = ?").run(NOW(), entry_key);
    recordVaultAudit(clanId, registered.auditActions.read, entry_key, actor, { hit: true });
    return parsed;
}
