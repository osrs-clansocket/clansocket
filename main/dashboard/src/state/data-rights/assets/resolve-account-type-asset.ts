import { slugifyAssetKey } from "./slugify-asset-key.js";

const BASE = "/resources/osrs/icon_player_types";

const CANONICAL_TO_ASSET_SLUG: Record<string, string> = {
    ironman: "ironman",
    hardcore_ironman: "hardcore",
    ultimate_ironman: "ultimate",
};

export function resolveAccountTypeAsset(
    _table: string,
    _column: string,
    value: unknown,
    _row: Record<string, unknown>,
): string | null {
    const slug = slugifyAssetKey(value);
    if (slug.length === 0) return null;
    const assetSlug = CANONICAL_TO_ASSET_SLUG[slug];
    if (assetSlug === undefined) return null;
    return `${BASE}/${assetSlug}.webp`;
}
