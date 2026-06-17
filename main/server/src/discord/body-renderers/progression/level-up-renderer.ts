import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface LevelUpPayload {
    skill: string;
    level: number;
}

const CATEGORY = "Level";
const XP_BASE = 300;
const XP_DIVISOR = 4;
const XP_EXPONENT_DIVISOR = 7;

function xpAtLevel(level: number): number {
    if (level <= 1) return 0;
    let total = 0;
    for (let n = 1; n < level; n++) {
        total += Math.floor(n + XP_BASE * Math.pow(2, n / XP_EXPONENT_DIVISOR));
    }
    return Math.floor(total / XP_DIVISOR);
}

function formatXp(level: number): string {
    return xpAtLevel(level).toLocaleString("en-US");
}

export const renderLevelUp: Renderer = ({ payload, context }) => {
    const p = payload as LevelUpPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: p.skill,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** reached level \`${p.level}\` in \`${p.skill}\``,
        embed: null,
        tokens: {
            rsn: context.rsn,
            skill: p.skill,
            level: p.level,
            xpAtLevel: formatXp(p.level),
            clanName: context.clanName ?? "",
        },
    };
};
