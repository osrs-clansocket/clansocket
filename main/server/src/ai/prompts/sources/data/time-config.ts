export interface StalenessTier {
    readonly maxMs: number | null;
    readonly label: string;
    readonly phrasing: string;
}

function tier(maxMs: number | null, label: string, phrasing: string): StalenessTier {
    return { maxMs, label, phrasing };
}

export const STALENESS_TIERS: readonly StalenessTier[] = [
    tier(60_000, "live", '"currently doing X"'),
    tier(300_000, "fresh", '"just was", "a minute ago"'),
    tier(1_800_000, "recent", '"last seen X minutes ago"'),
    tier(null, "stale", '"last seen N min/hours ago, may not be current"'),
];

import {
    LOGIN_STATE_HOPPING,
    LOGIN_STATE_LOADING,
    LOGIN_STATE_LOGGED_IN,
} from "../../../../plugin-api/session/login-states.js";

export const ACTIVE_LOGIN_STATES: readonly string[] = [LOGIN_STATE_LOGGED_IN, LOGIN_STATE_LOADING, LOGIN_STATE_HOPPING];
