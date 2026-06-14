import { slugifyAssetKey } from "./slugify-asset-key.js";

const BASE = "/resources/osrs/game_combat_achievements";
const TABLE_PREFIX = "plugin_combat_achievements";
const SWORD_SUFFIX = "_sword";

export function resolveTierAsset(
    table: string,
    _column: string,
    value: unknown,
    _row: Record<string, unknown>,
): string | null {
    if (!table.startsWith(TABLE_PREFIX)) return null;
    const slug = slugifyAssetKey(value);
    if (slug.length === 0) return null;
    return `${BASE}/${slug}${SWORD_SUFFIX}.webp`;
}
