export function asString(v: unknown): string | null {
    return typeof v === "string" ? v : null;
}

export function asFiniteNumber(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function asObject(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export function asArray(v: unknown): unknown[] | null {
    return Array.isArray(v) ? v : null;
}

export function copyIfString<K extends string>(
    target: Record<string, unknown>,
    src: Record<string, unknown>,
    key: K,
): void {
    const s = asString(src[key]);
    if (s !== null) target[key] = s;
}

export function nonEmptyString(v: unknown): string | null {
    const s = asString(v);
    return s !== null && s.length > 0 ? s : null;
}
