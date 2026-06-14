import { del, get, set } from "idb-keyval";
import { VAULT_RECORD_KEY, type VaultRecord } from "./types.js";

export async function readRecord(): Promise<VaultRecord | null> {
    const raw = await get<VaultRecord | undefined>(VAULT_RECORD_KEY);
    return raw ?? null;
}

export async function writeRecord(record: VaultRecord): Promise<void> {
    await set(VAULT_RECORD_KEY, record);
}

export async function deleteRecord(): Promise<void> {
    await del(VAULT_RECORD_KEY);
}

export function orderedProviders(record: VaultRecord): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of record.priorityOrder ?? []) {
        if (p in record.entries && !seen.has(p)) {
            out.push(p);
            seen.add(p);
        }
    }
    for (const p of Object.keys(record.entries)) {
        if (!seen.has(p)) {
            out.push(p);
            seen.add(p);
        }
    }
    return out;
}
