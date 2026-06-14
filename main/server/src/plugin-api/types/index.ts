import type { ClanClientMessage } from "./client-clan.js";
import type { CompletionsClientMessage } from "./client-completions.js";
import type { HandshakeClientMessage } from "./client-handshake.js";
import type { TelemetryClientMessage } from "./client-telemetry.js";

export type { PluginLoginState } from "./shared.js";

export type PluginClientMessage =
    | HandshakeClientMessage
    | ClanClientMessage
    | TelemetryClientMessage
    | CompletionsClientMessage
    | { type: "batch"; seq: number; tick: number; events: PluginClientMessage[] };

export type PluginServerMessage =
    | { type: "welcome"; sessionId: string }
    | { type: "pong"; ts?: number }
    | { type: "identity_ok" }
    | { type: "reidentify" }
    | { type: "clan_reminder"; reason: "not_registered" | "not_member"; clanName: string }
    | {
          type: "rsn_verify_request";
          requestId: number;
          requestingDisplayName: string;
          requestedRsn: string;
          expiresAt: number;
      }
    | { type: "rsn_verify_cancelled"; requestId: number }
    | {
          type: "claim_consent_request";
          requestId: number;
          requestingDisplayName: string;
          requestedRsn: string;
          requestedClanName: string;
          expiresAt: number;
      }
    | { type: "claim_consent_cancelled"; requestId: number }
    | { type: "broadcast"; message: string }
    | { type: "error"; reason: string };
