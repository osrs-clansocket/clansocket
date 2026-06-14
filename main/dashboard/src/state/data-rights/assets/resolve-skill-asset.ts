import { slugifyAssetKey } from "./slugify-asset-key.js";

const GAME_BASE = "/resources/osrs/game_skill";
const ENLARGED_BASE = "/resources/osrs/icon_skills_enlarged";
const ENLARGED_SUFFIX = "_xl";
const ENLARGED_TABLE_PREFIXES = ["plugin_stats", "plugin_boosts"];

const SKILL_NAME_ALIASES: Record<string, string> = {
    runecrafting: "runecraft",
};

function shouldUseEnlarged(table: string): boolean {
    for (const prefix of ENLARGED_TABLE_PREFIXES) {
        if (table.startsWith(prefix)) return true;
    }
    return false;
}

export function resolveSkillAsset(
    table: string,
    _column: string,
    value: unknown,
    _row: Record<string, unknown>,
): string | null {
    const rawSlug = slugifyAssetKey(value);
    if (rawSlug.length === 0) return null;
    const slug = SKILL_NAME_ALIASES[rawSlug] ?? rawSlug;
    if (shouldUseEnlarged(table)) {
        return `${ENLARGED_BASE}/${slug}${ENLARGED_SUFFIX}.webp`;
    }
    return `${GAME_BASE}/${slug}.webp`;
}
