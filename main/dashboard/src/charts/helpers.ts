const BILLION = 1_000_000_000;
const MILLION = 1_000_000;
const THOUSAND = 1_000;
const SCALE_LADDER: Array<[number, string, number]> = [
    [BILLION, "B", 2],
    [MILLION, "M", 2],
    [THOUSAND, "K", 1],
];
const WEEK_DAY_THRESHOLD = 14;
const PLACEHOLDER = "—";
const NO_DELTA = "·";

function formatNumber(n: number): string {
    if (!Number.isFinite(n)) return PLACEHOLDER;
    const abs = Math.abs(n);
    for (const [divisor, suffix, digits] of SCALE_LADDER) {
        if (abs >= divisor) return `${parseFloat((n / divisor).toFixed(digits))}${suffix}`;
    }
    return n.toLocaleString();
}

function formatDelta(n: number, suffix = ""): string {
    if (!Number.isFinite(n) || n === 0) return NO_DELTA;
    const sign = n > 0 ? "+" : "";
    return `${sign}${formatNumber(n)}${suffix}`;
}

function emptyMember(v: unknown): boolean {
    return v == null || v === 0 || (Array.isArray(v) && v.length === 0);
}

function isEmpty(data: unknown): boolean {
    if (data == null || (Array.isArray(data) && data.length === 0)) return true;
    if (typeof data !== "object" || Array.isArray(data)) return false;
    const obj = data as Record<string, unknown>;
    return Object.values(obj).every(emptyMember);
}

interface SeriesLike {
    points?: { t: unknown; v: number }[];
}

function dropEmptySeries<T extends SeriesLike>(series: T[]): T[] {
    return series.filter((s) => Array.isArray(s.points) && s.points.length > 0);
}

function timeUnitForWindow(window: string): "hour" | "day" | "week" {
    if (window.endsWith("h")) return "hour";
    if (window.endsWith("d") && parseInt(window) > WEEK_DAY_THRESHOLD) return "week";
    return "day";
}

export { formatNumber, formatDelta, isEmpty, dropEmptySeries, timeUnitForWindow, PLACEHOLDER, NO_DELTA };
