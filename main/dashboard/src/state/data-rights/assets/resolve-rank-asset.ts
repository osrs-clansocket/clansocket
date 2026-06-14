import { rankIconPath } from "../../icons/rank-icons.js";

export function resolveRankAsset(
    _table: string,
    _column: string,
    value: unknown,
    _row: Record<string, unknown>,
): string | null {
    if (value === null || value === undefined) return null;
    const s = String(value);
    if (s.length === 0) return null;
    return rankIconPath(s);
}
