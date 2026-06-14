const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function nowIso(): string {
    return new Date().toISOString();
}

function normalizeTimestamp(v: Date | string | null | undefined): string | null {
    if (!v) return null;
    return typeof v === "string" ? v : v.toISOString();
}

function toMs(iso: string): number {
    return new Date(iso).getTime();
}

function hourFloor(iso: string): string {
    const ms = toMs(iso);
    return new Date(Math.floor(ms / MS_PER_HOUR) * MS_PER_HOUR).toISOString();
}

function dayFloor(iso: string): string {
    const ms = toMs(iso);
    return new Date(Math.floor(ms / MS_PER_DAY) * MS_PER_DAY).toISOString();
}

function weekFloor(iso: string): string {
    const d = new Date(iso);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
}

function monthFloor(iso: string): string {
    const d = new Date(iso);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function hoursBetween(aIso: string, bIso: string): number {
    return Math.abs(toMs(bIso) - toMs(aIso)) / MS_PER_HOUR;
}

function msBetween(aIso: string, bIso: string): number {
    return Math.abs(toMs(bIso) - toMs(aIso));
}

function cutoffFromNow(msAgo: number): string {
    return new Date(Date.now() - msAgo).toISOString();
}

export {
    nowIso,
    normalizeTimestamp,
    toMs,
    hourFloor,
    dayFloor,
    weekFloor,
    monthFloor,
    hoursBetween,
    msBetween,
    cutoffFromNow,
};
export { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY };
