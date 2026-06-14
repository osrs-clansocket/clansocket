import type { ConsentRequestRow } from "../../database/site/consent/types.js";
import type { PluginSocketState } from "../session/socket-state.js";

export const CLAIM_ELIGIBLE_RANKS_SET = new Set(["Owner", "Deputy Owner"]);

export function rsnMatchesConsent(state: PluginSocketState, consent: ConsentRequestRow): boolean {
    if (!state.sessionRsn) return false;
    return state.sessionRsn.toLowerCase() === consent.target_rsn.toLowerCase();
}
