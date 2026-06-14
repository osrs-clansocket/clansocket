import type { PluginLoginState } from "./shared.js";

export type HelloMsg = { type: "hello"; protocolVersion?: number; token?: string };
export type PingMsg = { type: "ping"; ts?: number };

export type RsnVerifyResponseMsg = {
    type: "rsn_verify_response";
    requestId: number;
    action: "confirm" | "reject";
};

export type ClaimConsentResponseMsg = {
    type: "claim_consent_response";
    requestId: number;
    action: "confirm" | "reject";
    clanProof?: {
        roster?: {
            clanName: string;
            fingerprint: string;
            members: { name: string; rank: string | null; joinedAt: string | null }[];
        };
        titles?: {
            clanName: string;
            fingerprint: string;
            titles: { rank: number; titleId: number; title: string }[];
        };
    };
};

export type IdentityMsg = {
    type: "identity";
    rsn: string;
    accountHash: string;
    accountType?: string;
    world: number;
    worldTypes: string[];
    activity?: string;
    clanName?: string;
    clanRank?: string;
    clanJoinedAt?: string;
    clanMemberCount?: number;
    clanOnlineCount?: number;
    pluginVersion?: string;
    schemaVersion?: number;
    sessionStart: string;
};

export type LoginStateMsg = { type: "login_state"; state: PluginLoginState };

export type HandshakeClientMessage =
    | HelloMsg
    | PingMsg
    | RsnVerifyResponseMsg
    | ClaimConsentResponseMsg
    | IdentityMsg
    | LoginStateMsg;
