import { slugifyAssetKey } from "./slugify-asset-key.js";

const BASE = "/resources/osrs/icon_player_types";

export function resolveAccountTypeAsset(
    _table: string,
    _column: string,
    value: unknown,
    _row: Record<string, unknown>,
): string | null {
    const slug = slugifyAssetKey(value);
    if (slug.length === 0) return null;
    return `${BASE}/${slug}.webp`;
}
