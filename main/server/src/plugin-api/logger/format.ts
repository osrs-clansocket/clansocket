import { MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from "../../shared/time.js";

const THOUSAND = 1000;
const MILLION = 1_000_000;
const BILLION = 1_000_000_000;
const SESSION_PREVIEW_CHARS = 8;
const SUB_TEN_K_PRECISION = 2;
const SUB_MILLION_PRECISION = 1;

export function shortSession(sid: string): string {
    return sid.slice(0, SESSION_PREVIEW_CHARS);
}

export function truncatePad(s: string, width: number): string {
    if (s.length === width) return s;
    if (s.length > width) return s.slice(0, width - 1) + "…";
    return s.padEnd(width);
}

export function formatNumber(n: number): string {
    if (typeof n !== "number") return String(n);
    if (n < THOUSAND) return String(n);
    if (n < MILLION) return (n / THOUSAND).toFixed(n < 10_000 ? SUB_TEN_K_PRECISION : SUB_MILLION_PRECISION) + "K";
    if (n < BILLION) return (n / MILLION).toFixed(SUB_TEN_K_PRECISION) + "M";
    return (n / BILLION).toFixed(SUB_TEN_K_PRECISION) + "B";
}

export function formatDuration(ms: number): string {
    if (ms < MS_PER_SECOND) return `${ms}ms`;
    if (ms < MS_PER_MINUTE) return `${Math.floor(ms / MS_PER_SECOND)}s`;
    if (ms < MS_PER_HOUR) {
        const minutes = Math.floor(ms / MS_PER_MINUTE);
        const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);
        return `${minutes}m ${seconds}s`;
    }
    const hours = Math.floor(ms / MS_PER_HOUR);
    const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
    return `${hours}h ${minutes}m`;
}
