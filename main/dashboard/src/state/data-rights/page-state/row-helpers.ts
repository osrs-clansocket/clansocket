const ISO_DATE_LEN = 10;

export function dateInputValue(ms: number | null): string {
    return ms === null ? "" : new Date(ms).toISOString().slice(0, ISO_DATE_LEN);
}

export function parseDate(s: string, endOfDay: boolean): number | null {
    if (!s) return null;
    const ms = Date.parse(endOfDay ? `${s}T23:59:59Z` : `${s}T00:00:00Z`);
    return Number.isFinite(ms) ? ms : null;
}

export function pkKeyOf(row: Record<string, unknown>, pkCols: readonly string[]): string {
    return pkCols.map((c) => String(row[c] ?? "")).join("|");
}
