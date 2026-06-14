import type { RegisteredEntryType } from "../shared/vault-types.js";

const registry = new Map<string, RegisteredEntryType<unknown>>();

export function registerVaultEntryType<T>(entry: RegisteredEntryType<T>): void {
    if (registry.has(entry.entry_key)) {
        throw new Error(`vault entry type already registered: ${entry.entry_key}`);
    }
    registry.set(entry.entry_key, entry as RegisteredEntryType<unknown>);
}

export function getVaultEntryType(entry_key: string): RegisteredEntryType<unknown> | null {
    return registry.get(entry_key) ?? null;
}

export function listRegisteredEntryKeys(): readonly string[] {
    return [...registry.keys()];
}
