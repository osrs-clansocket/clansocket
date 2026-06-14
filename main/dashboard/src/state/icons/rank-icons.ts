import iconColors from "./icon-colors.json";

const RANK_ICON_BASE = "/resources/osrs/icon_clan_ranks";
const COLORS = iconColors as Record<string, string>;
const CHAR_SPACE = 32;
const CHAR_UPPER_A = 65;
const CHAR_UPPER_Z = 90;
const ASCII_CASE_OFFSET = 32;

function slugifyRank(rank: string): string {
    let out = "";
    for (let i = 0; i < rank.length; i++) {
        const ch = rank.charCodeAt(i);
        if (ch === CHAR_SPACE) {
            out += "_";
        } else if (ch >= CHAR_UPPER_A && ch <= CHAR_UPPER_Z) {
            out += String.fromCharCode(ch + ASCII_CASE_OFFSET);
        } else {
            out += rank.charAt(i);
        }
    }
    return out;
}

export function rankIconPath(rank: string): string {
    return `${RANK_ICON_BASE}/${slugifyRank(rank)}.webp`;
}

export function rankIconColor(rank: string | null): string | null {
    if (rank === null || rank.length === 0) return null;
    return COLORS[`${slugifyRank(rank)}.webp`] ?? null;
}

export function rankColorClass(rank: string | null): string | null {
    if (rank === null || rank.length === 0) return null;
    const slug = slugifyRank(rank);
    if (COLORS[`${slug}.webp`] === undefined) return null;
    return `rank-color-${slug}`;
}
