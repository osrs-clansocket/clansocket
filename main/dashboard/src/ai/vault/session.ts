import { del, get, set } from "idb-keyval";
import type { DerivedKey } from "./crypto";
import { getEntry, type ProviderConfig } from "./vault";
import { events, AppEvents } from "../../managers/events";

const IDB_SESSION_KEY = "aiVaultSessionKey";
const IDB_SESSION_TOKEN = "aiVaultSessionToken";
const SS_SESSION_TOKEN = "aiVaultSession";

let activeKey: DerivedKey | null = null;
const plaintextCache = new Map<string, ProviderConfig>();
const listeners = new Set<(unlocked: boolean) => void>();

function notify(unlocked: boolean): void {
    for (const fn of listeners) fn(unlocked);
    events.emit(AppEvents.AI_VAULT_CHANGED);
}

function persistSession(key: DerivedKey): void {
    const token = crypto.randomUUID();
    sessionStorage.setItem(SS_SESSION_TOKEN, token);
    void set(IDB_SESSION_TOKEN, token);
    void set(IDB_SESSION_KEY, key.key);
}

function clearPersistedSession(): void {
    sessionStorage.removeItem(SS_SESSION_TOKEN);
    void del(IDB_SESSION_TOKEN);
    void del(IDB_SESSION_KEY);
}

export function setActiveKey(key: DerivedKey): void {
    activeKey = key;
    plaintextCache.clear();
    persistSession(key);
    notify(true);
}

export async function restoreSession(): Promise<void> {
    if (activeKey !== null) return;
    const token = sessionStorage.getItem(SS_SESSION_TOKEN);
    if (token === null) return;
    const storedToken = await get<string>(IDB_SESSION_TOKEN);
    if (storedToken !== token) return;
    const cryptoKey = await get<CryptoKey>(IDB_SESSION_KEY);
    if (cryptoKey === undefined) return;
    activeKey = { key: cryptoKey };
    plaintextCache.clear();
    notify(true);
}

export function getActiveKey(): DerivedKey | null {
    return activeKey;
}

export function isUnlocked(): boolean {
    return activeKey !== null;
}

export function lockSession(): void {
    activeKey = null;
    plaintextCache.clear();
    clearPersistedSession();
    notify(false);
}

export async function getProviderConfig(provider: string): Promise<ProviderConfig | null> {
    const cached = plaintextCache.get(provider);
    if (cached !== undefined) return cached;
    if (!activeKey) return null;
    const config = await getEntry(activeKey, provider);
    if (config !== null) plaintextCache.set(provider, config);
    return config;
}

export function invalidateCachedKey(provider: string): void {
    plaintextCache.delete(provider);
}

export function onLockChange(fn: (unlocked: boolean) => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}
