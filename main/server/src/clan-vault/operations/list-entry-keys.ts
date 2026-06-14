import { getClanVaultDb } from "../../database/core/database-clans.js";
import { assertActor } from "../recorders/audit-recorder.js";
import type { Actor, EntryMetadata, VerifyStatus } from "../shared/vault-types.js";

interface MetadataRow {
    entry_key: string;
    entry_type: string;
    set_at: number;
    last_verified_at: number | null;
    last_verified_status: VerifyStatus | null;
}

export async function listVaultEntryKeys(clanId: string, actor: Actor): Promise<EntryMetadata[]> {
    assertActor(actor);
    const db = getClanVaultDb(clanId);
    const rows = db.prepare(`
        SELECT entry_key, entry_type, set_at, last_verified_at, last_verified_status
        FROM vault_entries
    `).all() as ReadonlyArray<MetadataRow>;
    return rows.map((r) => ({
        entry_key: r.entry_key,
        entry_type: r.entry_type,
        set_at: r.set_at,
        last_verified_at: r.last_verified_at,
        last_verified_status: r.last_verified_status,
    }));
}
