import type { PluginRosterSnapshotEntry, PluginSocketState } from "../socket-state.js";
import { getWss } from "../../transport/wss-registry.js";

const sessionsById = new Map<string, PluginSocketState>();

export interface PluginSessionContext {
    sessionId: string;
    accountHash: string;
    rsn: string;
    mode: string;
    clanId: string;
    world: number;
}

export interface PluginLiveSession {
    sessionId: string;
    accountHash: string;
    rsn: string;
    world: number;
    loginState: string;
    inGameClanId: string | null;
    inGameClanRank: string | null;
    managerClanId: string | null;
    managerVerified: boolean;
    autoVerifyReason: "owner_deputy" | "rank_whitelist" | "account_binding" | null;
    rosterSnapshot: ReadonlyMap<string, PluginRosterSnapshotEntry> | null;
    lastIdentityAt: number;
    connectedAt: number;
    pingMs: number | null;
}

export function registerSession(sessionId: string, state: PluginSocketState): void {
    sessionsById.set(sessionId, state);
}

export function unregisterSession(sessionId: string): void {
    sessionsById.delete(sessionId);
}

export function getPluginConnectedCount(): number {
    const wss = getWss();
    return wss ? wss.clients.size : 0;
}

export function getSessionStateById(sessionId: string): PluginSocketState | undefined {
    return sessionsById.get(sessionId);
}

export function getPluginSessionContext(sessionId: string | undefined | null): PluginSessionContext | null {
    if (!sessionId) return null;
    const state = sessionsById.get(sessionId);
    if (!state || !state.authed || !state.sessionAccount || !state.sockMode || !state.sockClanId) return null;
    return {
        sessionId,
        accountHash: state.sessionAccount,
        rsn: state.sessionRsn ?? "",
        mode: state.sockMode,
        clanId: state.sockClanId,
        world: state.currentWorld,
    };
}

export function findLiveSessionsByRsn(rsn: string): PluginLiveSession[] {
    const out: PluginLiveSession[] = [];
    const target = rsn.toLowerCase();
    for (const [sessionId, state] of sessionsById.entries()) {
        if (!state.authed || !state.sessionAccount || !state.sessionRsn) continue;
        if (state.sessionRsn.toLowerCase() !== target) continue;
        out.push(toLiveSession(sessionId, state));
    }
    return out;
}

export function findSessionsByAccountHash(accountHash: string, requireManagerOfClanId?: string): PluginLiveSession[] {
    const out: PluginLiveSession[] = [];
    for (const [sessionId, state] of sessionsById.entries()) {
        if (!state.authed || !state.sessionAccount || !state.sessionRsn) continue;
        if (state.sessionAccount !== accountHash) continue;
        if (requireManagerOfClanId) {
            if (!state.managerVerified) continue;
            if (state.managerClanId !== requireManagerOfClanId) continue;
        }
        out.push(toLiveSession(sessionId, state));
    }
    return out;
}

export function findManagerSessionsForClan(clanId: string): PluginLiveSession[] {
    const out: PluginLiveSession[] = [];
    for (const [sessionId, state] of sessionsById.entries()) {
        if (!state.authed || !state.sessionAccount || !state.sessionRsn) continue;
        if (!state.managerVerified) continue;
        if (state.managerClanId !== clanId) continue;
        out.push(toLiveSession(sessionId, state));
    }
    return out;
}

function toLiveSession(sessionId: string, state: PluginSocketState): PluginLiveSession {
    return {
        sessionId,
        accountHash: state.sessionAccount!,
        rsn: state.sessionRsn!,
        world: state.currentWorld,
        loginState: state.loginState,
        inGameClanId: state.sockClanId,
        inGameClanRank: state.latestClanRank,
        managerClanId: state.managerClanId,
        managerVerified: state.managerVerified,
        autoVerifyReason: state.autoVerifyReason,
        rosterSnapshot: state.lastRosterSnapshot,
        lastIdentityAt: state.lastIdentityAt,
        connectedAt: state.connectedAt,
        pingMs: state.lastRttMs,
    };
}

export { requestReidentifyAndAwait } from "./reidentify.js";
