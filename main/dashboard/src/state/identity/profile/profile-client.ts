import { identityClient } from "../identity-client/index.js";
import { readJsonOrFallback } from "../../fetch-result.js";

export type AutoVerifyReason = "owner_deputy" | "rank_whitelist" | "account_binding";
export type ClanStatus = "unclaimed" | "pending" | "active" | "recovery" | "archived";
export type PluginLoginState =
    | "LOGGED_IN"
    | "LOGGED_OUT"
    | "LOGIN_SCREEN"
    | "LOGIN_SCREEN_AUTHENTICATOR"
    | "LOGGING_IN"
    | "LOADING"
    | "HOPPING"
    | "CONNECTION_LOST"
    | "STARTING"
    | "UNKNOWN";

export interface LiveSession {
    sessionId: string;
    accountHash: string;
    rsn: string;
    world: number;
    loginState: PluginLoginState;
    inGameClanId: string | null;
    inGameClanName: string;
    inGameClanStatus: ClanStatus | null;
    inGameClanRank: string | null;
    managerClanId: string | null;
    managerClanName: string;
    managerVerified: boolean;
    autoVerifyReason: AutoVerifyReason | null;
    lastIdentityAt: number;
    connectedAt: number;
    pingMs: number | null;
}

async function listSessions(): Promise<LiveSession[]> {
    const res = await identityClient.authedFetch("/api/auth/site/sessions");
    const body = await readJsonOrFallback<{ sessions: LiveSession[] }>(res, { sessions: [] });
    return body.sessions;
}

export const profileClient = { listSessions };
