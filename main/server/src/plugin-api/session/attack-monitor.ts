import type { IncomingMessage } from "http";
import { MS_PER_MINUTE } from "../../shared/time.js";

const WINDOW_MS = MS_PER_MINUTE;
const MAX_FAILURES_IN_WINDOW = 5;
const FREEZE_DURATION_MS = 15 * MS_PER_MINUTE;

export function clientIpFor(req: IncomingMessage): string {
    if (process.env.BEHIND_PROXY === "1") {
        const xff = req.headers["x-forwarded-for"];
        const raw = Array.isArray(xff) ? xff[0] : xff;
        if (typeof raw === "string" && raw.length > 0) {
            const first = raw.split(",")[0]?.trim();
            if (first) return first;
        }
    }
    return req.socket.remoteAddress ?? "?";
}

interface FailureEntry {
    count: number;
    firstAt: number;
    frozenUntil: number;
}

const failures = new Map<string, FailureEntry>();

function sweep(now: number): void {
    for (const [ip, entry] of failures) {
        const expired = entry.frozenUntil <= now && now - entry.firstAt > WINDOW_MS;
        if (expired) failures.delete(ip);
    }
}

export function registerIdentityFailure(ip: string, now: number): void {
    sweep(now);
    const entry = failures.get(ip);
    if (!entry || now - entry.firstAt > WINDOW_MS) {
        failures.set(ip, { count: 1, firstAt: now, frozenUntil: 0 });
        return;
    }
    entry.count += 1;
    if (entry.count > MAX_FAILURES_IN_WINDOW) {
        entry.frozenUntil = now + FREEZE_DURATION_MS;
    }
}

export function isIpFrozen(ip: string, now: number): boolean {
    const entry = failures.get(ip);
    if (!entry) return false;
    return entry.frozenUntil > now;
}
