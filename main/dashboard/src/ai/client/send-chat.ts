import { getProviderConfig, isUnlocked } from "../vault/session";
import { listProviders as listVaultProviders, vaultExists } from "../vault/vault";
import { attemptChatWithProvider } from "./send-attempt.js";
import type { EventFn, SendOptions, SendResult, StatusFn } from "./types.js";

interface TryParams {
    provider: string;
    opts: SendOptions;
    onStatus?: StatusFn;
    onEvent?: EventFn;
    signal?: AbortSignal;
}

interface TryOutcome {
    result?: SendResult;
    failure?: string;
    throwError?: Error;
}

async function ensureReadyVault(): Promise<string[]> {
    if (!(await vaultExists())) throw new Error("Vault not set up. Open AI Settings to create one.");
    if (!isUnlocked()) throw new Error("Vault is locked. Open AI Settings to unlock.");
    const providers = await listVaultProviders();
    if (providers.length === 0) throw new Error("No AI provider key in vault. Add one in AI Settings.");
    return providers;
}

async function tryProvider(p: TryParams): Promise<TryOutcome> {
    const config = await getProviderConfig(p.provider);
    if (config === null) return { failure: `${p.provider}: no config` };
    const attempt = await attemptChatWithProvider({
        provider: p.provider,
        config,
        opts: p.opts,
        onStatus: p.onStatus,
        onEvent: p.onEvent,
        signal: p.signal,
    });
    if (attempt.result) return { result: attempt.result };
    if (attempt.httpError !== undefined) {
        return { throwError: new Error(`Chat request rejected: ${attempt.httpError}`) };
    }
    const err = attempt.streamError ?? "unknown";
    if (attempt.committed) {
        return { throwError: new Error(`${p.provider} failed mid-stream: ${err}`) };
    }
    return { failure: `${p.provider}: ${err}` };
}

export async function sendChat(
    opts: SendOptions,
    onStatus?: StatusFn,
    onEvent?: EventFn,
    signal?: AbortSignal,
): Promise<SendResult> {
    const providers = await ensureReadyVault();
    const failures: string[] = [];
    for (let i = 0; i < providers.length; i++) {
        const provider = providers[i]!;
        const r = await tryProvider({ provider, opts, onStatus, onEvent, signal });
        if (r.result) return r.result;
        if (r.throwError) throw r.throwError;
        if (r.failure) failures.push(`#${i + 1} ${r.failure}`);
    }
    throw new Error(`No valid API key found. ${failures.join("; ")}`);
}
