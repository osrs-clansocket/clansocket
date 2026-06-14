import { slugifyAssetKey } from "./slugify-asset-key.js";
import { HISCORES_TRACKED } from "./hiscores-tracked-set.js";

const BASE = "/resources/osrs/icon_hiscores";

export function resolveHiscoresAsset(
    _table: string,
    _column: string,
    value: unknown,
    _row: Record<string, unknown>,
): string | null {
    const slug = slugifyAssetKey(value);
    if (slug.length === 0) return null;
    if (!HISCORES_TRACKED.has(slug)) return null;
    return `${BASE}/${slug}.webp`;
}
