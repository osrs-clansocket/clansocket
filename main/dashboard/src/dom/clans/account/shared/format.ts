import { HOURS_PER_DAY, MINUTES_PER_HOUR, MS_PER_SECOND, SECONDS_PER_MINUTE } from "../../../../state/time-units.js";

export const HEX_LEN = 7;
export const HEX_BODY_LEN = 6;
const CHARCODE_0 = 48;
const CHARCODE_9 = 57;
const CHARCODE_LOWER_A = 97;
const CHARCODE_LOWER_F = 102;
const CHARCODE_UPPER_A = 65;
const CHARCODE_UPPER_F = 70;
const PING_GOOD = 100;
const PING_OK = 250;

export function isHexChar(code: number): boolean {
    if (code >= CHARCODE_0 && code <= CHARCODE_9) return true;
    if (code >= CHARCODE_LOWER_A && code <= CHARCODE_LOWER_F) return true;
    if (code >= CHARCODE_UPPER_A && code <= CHARCODE_UPPER_F) return true;
    return false;
}

export function isHexColor(str: string): boolean {
    if (str.length !== HEX_LEN) return false;
    if (str[0] !== "#") return false;
    for (let i = 1; i <= HEX_BODY_LEN; i++) {
        if (!isHexChar(str.charCodeAt(i))) return false;
    }
    return true;
}

export function normalizeHex(raw: string): string | null {
    const trimmed = raw.trim().toLowerCase();
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    return isHexColor(withHash) ? withHash : null;
}

export function fmtUptime(connectedAt: number | null | undefined): string {
    if (typeof connectedAt !== "number" || !Number.isFinite(connectedAt) || connectedAt <= 0) return "—";
    const secs = Math.max(0, Math.floor((Date.now() - connectedAt) / MS_PER_SECOND));
    if (secs < SECONDS_PER_MINUTE) return `${secs}s`;
    const mins = Math.floor(secs / SECONDS_PER_MINUTE);
    if (mins < MINUTES_PER_HOUR) return `${mins}m`;
    const hours = Math.floor(mins / MINUTES_PER_HOUR);
    const remMins = mins % MINUTES_PER_HOUR;
    if (hours < HOURS_PER_DAY) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
    const days = Math.floor(hours / HOURS_PER_DAY);
    const remHours = hours % HOURS_PER_DAY;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export function pingClass(pingMs: number | null | undefined): string {
    if (typeof pingMs !== "number" || !Number.isFinite(pingMs))
        return "account__session-ping account__session-ping--unknown";
    if (pingMs < PING_GOOD) return "account__session-ping account__session-ping--good";
    if (pingMs < PING_OK) return "account__session-ping account__session-ping--ok";
    return "account__session-ping account__session-ping--bad";
}
