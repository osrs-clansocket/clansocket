import { encryptToken } from "../../crypto/aes-gcm-encrypter.js";
import { getClanVaultMasterKey } from "../../crypto/clan-vault-master-key-loader.js";
import { getClanVaultDb } from "../../database/core/database-clans.js";
import { getVaultEntryType } from "../registries/vault-entry-type-registry.js";
import { actorAttribution, assertActor, recordVaultAudit } from "../recorders/audit-recorder.js";
import type { Actor, PayloadValidator, WriteResult } from "../shared/vault-types.js";

const NOW = (): number => Date.now();

const UPSERT_SQL = `INSERT INTO vault_entries
    (entry_key, entry_type, schema_version, iv_b64, ciphertext_b64, set_by, set_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(entry_key) DO UPDATE SET
    entry_type = excluded.entry_type,
    schema_version = excluded.schema_version,
    iv_b64 = excluded.iv_b64,
    ciphertext_b64 = excluded.ciphertext_b64,
    set_by = excluded.set_by,
    set_at = excluded.set_at,
    updated_at = excluded.updated_at`;

export async function writeVaultEntry<T>(
    clanId: string,
    entry_key: string,
    entry_type: string,
    payload: T,
    actor: Actor,
    validate: PayloadValidator<T>,
): Promise<WriteResult> {
    assertActor(actor);
    const registered = getVaultEntryType(entry_key);
    if (registered === null) {
        return { ok: false, reason: "unknown-entry-type" };
    }
    if (!validate(payload)) {
        recordVaultAudit(clanId, registered.auditActions.write, entry_key, actor, { reason: "schema-violation", entry_type });
        return { ok: false, reason: "schema-violation" };
    }
    const setBy = actorAttribution(actor);
    if (setBy === null) {
        throw new Error("vault writes require an actor.user_id (system actors cannot write)");
    }
    const plaintext = JSON.stringify(payload);
    const { b64, iv } = encryptToken(plaintext, getClanVaultMasterKey());
    const db = getClanVaultDb(clanId);
    const now = NOW();
    db.prepare(UPSERT_SQL).run(entry_key, entry_type, registered.schema_version, iv, b64, setBy, now, now);
    recordVaultAudit(clanId, registered.auditActions.write, entry_key, actor, { entry_type });
    return { ok: true };
}
