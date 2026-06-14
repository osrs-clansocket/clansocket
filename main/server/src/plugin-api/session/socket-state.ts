import type { WebSocket } from "ws";
import { LOGIN_STATE_BOOTSTRAPPING, LOGIN_STATE_UNKNOWN } from "./login-states.js";
import { PLUGIN_IDENTITY_TIMEOUT_MS, PLUGIN_RL_UNAUTHED_BURST, PLUGIN_RL_UNAUTHED_PER_SEC } from "../constants.js";
import { createTokenBucket, type TokenBucket } from "./ratelimit.js";
import type { PluginLoginState } from "../types/index.js";

export interface PluginRosterSnapshotEntry {
    rank: string | null;
    joinedAt: string | null;
}

export interface PluginSocketState {
    isAlive: boolean;
    authed: boolean;
    sessionAccount: string | null;
    sessionRsn: string | null;
    sockMode: string | null;
    sockClanId: string | null;
    currentWorld: number;
    bucket: TokenBucket;
    unauthedEventCount: number;
    staleIdentityEventCount: number;
    notLoggedInEventCount: number;
    identityTimer: NodeJS.Timeout | null;
    loginState: PluginLoginState;
    prevLoginState: string;
    lastIdentityAt: number;
    lastPingAt: number;
    lastRttMs: number | null;
    connectedAt: number;
    snapshotHashes: Map<string, string>;
    lastBatchSeq: number;
    lastRosterFingerprint: string | null;
    managerClanId: string | null;
    managerVerified: boolean;
    autoVerifyReason: "owner_deputy" | "rank_whitelist" | "account_binding" | null;
    clanStatus: string | null;
    clanVerified: boolean;
    latestClanRank: string | null;
    lastRosterSnapshot: Map<string, PluginRosterSnapshotEntry> | null;
    identityWaiters: Set<() => void>;
}

export type PluginSocket = WebSocket & { pluginState?: PluginSocketState };

export function createInitialSocketState(onIdentityTimeout: () => void): PluginSocketState {
    const state: PluginSocketState = {
        isAlive: true,
        authed: false,
        sessionAccount: null,
        sessionRsn: null,
        sockMode: null,
        sockClanId: null,
        currentWorld: 0,
        bucket: createTokenBucket(PLUGIN_RL_UNAUTHED_PER_SEC, PLUGIN_RL_UNAUTHED_BURST),
        unauthedEventCount: 0,
        staleIdentityEventCount: 0,
        notLoggedInEventCount: 0,
        identityTimer: setTimeout(onIdentityTimeout, PLUGIN_IDENTITY_TIMEOUT_MS),
        loginState: LOGIN_STATE_UNKNOWN,
        prevLoginState: LOGIN_STATE_BOOTSTRAPPING,
        lastIdentityAt: 0,
        lastPingAt: 0,
        lastRttMs: null,
        connectedAt: Date.now(),
        snapshotHashes: new Map<string, string>(),
        lastBatchSeq: 0,
        lastRosterFingerprint: null,
        managerClanId: null,
        managerVerified: false,
        autoVerifyReason: null,
        clanStatus: null,
        clanVerified: false,
        latestClanRank: null,
        lastRosterSnapshot: null,
        identityWaiters: new Set(),
    };
    return state;
}
