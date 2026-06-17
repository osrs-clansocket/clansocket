import { runClanWomWrite } from "../db-runners.js";
import type { WomRateWindowStateName } from "./get.js";

const WINDOW_MS = 60000;
const NEAR_LIMIT_FRACTION = 0.8;
const MAX_CONSECUTIVE_429 = 5;

function deriveStateName(window_count: number, rate_limit: number): WomRateWindowStateName {
    if (window_count >= rate_limit) return "at_limit";
    if (window_count >= NEAR_LIMIT_FRACTION * rate_limit) return "near_limit";
    return "within_limit";
}

export function rollWomWindowIfElapsed(clanId: string, windowStart: number): boolean {
    const now = Date.now();
    if (now - windowStart < WINDOW_MS) return false;
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_rate_window
         SET window_start = ?, window_count = 0, state_name = 'within_limit'
         WHERE singleton_key = 'default'`,
        now,
    );
    return true;
}

export function recordWomRequestSent(clanId: string, current_count: number, rate_limit: number): void {
    const newCount = current_count + 1;
    const stateName = deriveStateName(newCount, rate_limit);
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_rate_window
         SET window_count = ?, last_request_at = ?, state_name = ?
         WHERE singleton_key = 'default'`,
        newCount,
        Date.now(),
        stateName,
    );
}

export function recordWom429(clanId: string, current_consecutive: number): WomRateWindowStateName {
    const newConsecutive = current_consecutive + 1;
    const nextState: WomRateWindowStateName = newConsecutive >= MAX_CONSECUTIVE_429 ? "banned" : "within_limit";
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_rate_window
         SET consecutive_429 = ?, state_name = ?
         WHERE singleton_key = 'default'`,
        newConsecutive,
        nextState,
    );
    return nextState;
}

export function recordWomSuccess(clanId: string): void {
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_rate_window
         SET consecutive_429 = 0
         WHERE singleton_key = 'default'`,
    );
}

export function clearWomBan(clanId: string): void {
    runClanWomWrite(
        clanId,
        `UPDATE clan_wom_rate_window
         SET consecutive_429 = 0, state_name = 'within_limit'
         WHERE singleton_key = 'default'`,
    );
}
