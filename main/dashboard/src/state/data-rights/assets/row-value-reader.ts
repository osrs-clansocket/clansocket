export function readFirstNumber(row: Record<string, unknown>, columns: readonly string[]): number | null {
    for (const c of columns) {
        const v = row[c];
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
            const trimmed = v.trim();
            if (trimmed.length === 0) continue;
            const n = Number(trimmed);
            if (Number.isFinite(n)) return n;
        }
    }
    return null;
}

export function readFirstString(row: Record<string, unknown>, columns: readonly string[]): string | null {
    for (const c of columns) {
        const v = row[c];
        if (typeof v === "string" && v.length > 0) return v;
        if (typeof v === "number" && Number.isFinite(v)) return String(v);
    }
    return null;
}
