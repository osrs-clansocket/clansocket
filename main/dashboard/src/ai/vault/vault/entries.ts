import { decrypt, encrypt, type DerivedKey } from "../crypto";
import { VaultDecryptError, VaultMissingError } from "./errors.js";
import { orderedProviders, readRecord, writeRecord } from "./storage.js";
import type { ProviderConfig, ProviderId } from "./types.js";

const NOT_FOUND = -1;

function serializeConfig(config: ProviderConfig): string {
    return JSON.stringify({ apiKey: config.apiKey, maxTokens: config.maxTokens, model: config.model });
}

function safeParse(plaintext: string): { apiKey?: unknown; maxTokens?: unknown; model?: unknown } | null {
    try {
        return JSON.parse(plaintext) as { apiKey?: unknown; maxTokens?: unknown; model?: unknown };
    } catch {
        return null;
    }
}

function deserializeConfig(plaintext: string): ProviderConfig {
    const parsed = safeParse(plaintext);
    if (parsed && typeof parsed.apiKey === "string") {
        const maxTokens =
            typeof parsed.maxTokens === "number" && Number.isFinite(parsed.maxTokens) ? parsed.maxTokens : undefined;
        const model = typeof parsed.model === "string" && parsed.model.length > 0 ? parsed.model : undefined;
        return { apiKey: parsed.apiKey, maxTokens, model };
    }
    return { apiKey: plaintext };
}

async function loadRecordOrThrow() {
    const record = await readRecord();
    if (!record) throw new VaultMissingError();
    return record;
}

export async function putEntry(
    derived: DerivedKey,
    provider: ProviderId,
    config: ProviderConfig | string,
): Promise<void> {
    const record = await loadRecordOrThrow();
    const isNew = !(provider in record.entries);
    const normalized: ProviderConfig = typeof config === "string" ? { apiKey: config } : config;
    const plaintext = serializeConfig(normalized);
    const blob = await encrypt(derived, plaintext);
    record.entries[provider] = { iv: blob.iv, ciphertext: blob.ciphertext };
    const order = orderedProviders(record);
    if (isNew && !order.includes(provider)) order.push(provider);
    record.priorityOrder = order;
    record.updatedAt = Date.now();
    await writeRecord(record);
}

export async function getEntry(derived: DerivedKey, provider: ProviderId): Promise<ProviderConfig | null> {
    const record = await loadRecordOrThrow();
    const entry = record.entries[provider];
    if (!entry) return null;
    try {
        const plaintext = await decrypt(derived, { iv: entry.iv, ciphertext: entry.ciphertext });
        return deserializeConfig(plaintext);
    } catch {
        throw new VaultDecryptError();
    }
}

export async function listProviders(): Promise<ProviderId[]> {
    const record = await readRecord();
    if (!record) return [];
    return orderedProviders(record);
}

export async function removeEntry(provider: ProviderId): Promise<void> {
    const record = await readRecord();
    if (!record) return;
    delete record.entries[provider];
    record.priorityOrder = (record.priorityOrder ?? []).filter((p) => p !== provider);
    record.updatedAt = Date.now();
    await writeRecord(record);
}

export async function moveEntry(provider: ProviderId, direction: "up" | "down"): Promise<void> {
    const record = await readRecord();
    if (!record) return;
    const order = orderedProviders(record);
    const idx = order.indexOf(provider);
    if (idx === NOT_FOUND) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target]!, order[idx]!];
    record.priorityOrder = order;
    record.updatedAt = Date.now();
    await writeRecord(record);
}

export async function setPriority(provider: ProviderId, newIndex: number): Promise<void> {
    const record = await readRecord();
    if (!record) return;
    const order = orderedProviders(record);
    const idx = order.indexOf(provider);
    if (idx === NOT_FOUND) return;
    const clamped = Math.max(0, Math.min(order.length - 1, newIndex));
    if (clamped === idx) return;
    const [item] = order.splice(idx, 1);
    order.splice(clamped, 0, item!);
    record.priorityOrder = order;
    record.updatedAt = Date.now();
    await writeRecord(record);
}
