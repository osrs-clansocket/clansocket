import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface DiariesPayload {
    completed: number;
    total: number;
}

interface DiaryCompletedPayload {
    region: string;
    tier: string;
}

const CATEGORY_ROLLUP = "Diaries";
const CATEGORY_SINGLE = "Diary";

function titleCase(s: string): string {
    if (s.length === 0) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const renderDiaries: Renderer = ({ payload, context }) => {
    const p = payload as DiariesPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY_ROLLUP).unicode,
        category: CATEGORY_ROLLUP,
        subject: null,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** \`${p.completed}/${p.total}\` complete`,
        embed: null,
        tokens: { rsn: context.rsn, completed: p.completed, total: p.total, clanName: context.clanName ?? "" },
    };
};

export const renderDiaryCompleted: Renderer = ({ payload, context }) => {
    const p = payload as DiaryCompletedPayload;
    const subject = `${titleCase(p.region)} ${titleCase(p.tier)}`;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY_SINGLE).unicode,
        category: CATEGORY_SINGLE,
        subject,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** completed`,
        embed: null,
        tokens: { rsn: context.rsn, region: p.region, tier: p.tier, clanName: context.clanName ?? "" },
    };
};
