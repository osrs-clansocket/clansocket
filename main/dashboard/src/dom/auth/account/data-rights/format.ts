import {
    DAYS_PER_MONTH,
    DAYS_PER_YEAR,
    HOURS_PER_DAY,
    MINUTES_PER_HOUR,
    MONTHS_PER_YEAR,
    MS_PER_MINUTE,
    MS_PER_SECOND,
    SECONDS_PER_MINUTE,
} from "../../../../state/time-units.js";

const BYTES_PER_KIB = 1024;
const BYTE_PRECISION_THRESHOLD = 100;
const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];
export const EMPTY_VALUE = "—";

export function formatCooldown(retryAfterMs: number | undefined): string {
    if (typeof retryAfterMs !== "number" || retryAfterMs <= 0) return "later";
    const s = Math.ceil(retryAfterMs / MS_PER_SECOND);
    if (s <= SECONDS_PER_MINUTE) return `${s}s`;
    const m = Math.ceil(s / SECONDS_PER_MINUTE);
    if (m < MINUTES_PER_HOUR) return `${m}m`;
    const h = Math.ceil(m / MINUTES_PER_HOUR);
    return `${h}h`;
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    let value = bytes;
    let unit = 0;
    while (value >= BYTES_PER_KIB && unit < BYTE_UNITS.length - 1) {
        value /= BYTES_PER_KIB;
        unit += 1;
    }
    const formatted = value >= BYTE_PRECISION_THRESHOLD || unit === 0 ? Math.round(value).toString() : value.toFixed(1);
    return `${formatted} ${BYTE_UNITS[unit]}`;
}

export function formatCount(n: number): string {
    if (!Number.isFinite(n)) return "0";
    return Math.trunc(n).toLocaleString("en-US");
}

export function formatSince(firstEntryAt: number | null): string {
    if (firstEntryAt === null) return EMPTY_VALUE;
    const diff = Date.now() - firstEntryAt;
    if (diff < MS_PER_MINUTE) return "just now";
    const minutes = Math.floor(diff / MS_PER_MINUTE);
    if (minutes < MINUTES_PER_HOUR) return `${minutes}m`;
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    if (hours < HOURS_PER_DAY) return `${hours}h`;
    const days = Math.floor(hours / HOURS_PER_DAY);
    if (days < DAYS_PER_MONTH) return `${days}d`;
    const months = Math.floor(days / DAYS_PER_MONTH);
    if (months < MONTHS_PER_YEAR) return `${months}mo`;
    const years = Math.floor(days / DAYS_PER_YEAR);
    const monthsRem = Math.floor((days - years * DAYS_PER_YEAR) / DAYS_PER_MONTH);
    return monthsRem > 0 ? `${years}y ${monthsRem}mo` : `${years}y`;
}
