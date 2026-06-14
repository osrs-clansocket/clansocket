import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from "../../../../../state/time-units.js";

export { setStatus } from "../../../status-line.js";

export function formatTimeLeft(deadlineMs: number, now: number): string {
    const msLeft = Math.max(0, deadlineMs - now);
    const days = Math.floor(msLeft / MS_PER_DAY);
    if (days >= 1) return `${days} ${days === 1 ? "day" : "days"}`;
    const hours = Math.floor(msLeft / MS_PER_HOUR);
    if (hours >= 1) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    const minutes = Math.floor(msLeft / MS_PER_MINUTE);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function formatRemaining(expiresAt: number, now: number): string {
    const msLeft = Math.max(0, expiresAt - now);
    const m = Math.floor(msLeft / MS_PER_MINUTE);
    const s = Math.floor((msLeft % MS_PER_MINUTE) / MS_PER_SECOND);
    return `${m}m ${s}s`;
}

export function formatVerifiedDate(ts: number): string {
    const d = new Date(ts);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
