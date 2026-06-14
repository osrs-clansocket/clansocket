import { PLUGIN_IP_UPGRADES_PER_MIN } from "../constants.js";

export interface TokenBucket {
    tryConsume(n?: number): boolean;
    reconfigure(ratePerSec: number, burst: number): void;
}

export function createTokenBucket(ratePerSec: number, burst: number): TokenBucket {
    let rate = ratePerSec;
    let capacity = burst;
    let tokens = burst;
    let lastRefillMs = Date.now();

    function refill(): void {
        const now = Date.now();
        const elapsed = (now - lastRefillMs) / 1000;
        tokens = Math.min(capacity, tokens + elapsed * rate);
        lastRefillMs = now;
    }

    return {
        tryConsume(n = 1): boolean {
            refill();
            if (tokens < n) return false;
            tokens -= n;
            return true;
        },
        reconfigure(newRate: number, newBurst: number): void {
            refill();
            rate = newRate;
            capacity = newBurst;
            if (tokens > capacity) tokens = capacity;
        },
    };
}

const WINDOW_MS = 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;

interface IpWindow {
    count: number;
    windowStartMs: number;
}

const ipWindows = new Map<string, IpWindow>();
let lastSweepAt = 0;

// Lazy sweep: every ipUpgradeLimiter call checks now − lastSweepAt; if past the threshold,
// drops stale entries inline. Trigger is the limiter call itself; no background timer.
function maybeSweep(now: number): void {
    if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
    lastSweepAt = now;
    for (const [ip, entry] of ipWindows) {
        if (now - entry.windowStartMs > WINDOW_MS * 2) ipWindows.delete(ip);
    }
}

export function ipUpgradeLimiter(ip: string): boolean {
    const now = Date.now();
    maybeSweep(now);
    const entry = ipWindows.get(ip);
    if (!entry || now - entry.windowStartMs > WINDOW_MS) {
        ipWindows.set(ip, { count: 1, windowStartMs: now });
        return true;
    }
    if (entry.count >= PLUGIN_IP_UPGRADES_PER_MIN) return false;
    entry.count += 1;
    return true;
}

export function stopIpUpgradeSweeper(): void {
    ipWindows.clear();
    lastSweepAt = 0;
}
