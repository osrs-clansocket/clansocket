import { slugifyAssetKey } from "./slugify-asset-key.js";

const BASE = "/resources/osrs/game_equipment";
const SLOT_PREFIX = "slot_";
const EQUIPMENT_TABLE_PREFIX = "plugin_equipment";

export function resolveSlotAsset(
    table: string,
    _column: string,
    value: unknown,
    _row: Record<string, unknown>,
): string | null {
    if (!table.startsWith(EQUIPMENT_TABLE_PREFIX)) return null;
    const slug = slugifyAssetKey(value);
    if (slug.length === 0) return null;
    return `${BASE}/${SLOT_PREFIX}${slug}.webp`;
}
