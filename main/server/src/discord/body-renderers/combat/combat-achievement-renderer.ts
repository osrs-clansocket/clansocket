import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface CACompletedPayload {
    name: string;
    tier: string;
    points: number;
}

interface CASnapshotPayload {
    totalCompleted: number;
}

const CATEGORY_SINGLE = "Achievement";
const CATEGORY_ROLLUP = "CAs";

export const renderCombatAchievementCompleted: Renderer = ({ payload, context }) => {
    const p = payload as CACompletedPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY_SINGLE).unicode,
        category: CATEGORY_SINGLE,
        subject: p.name,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** completed (**\`${p.tier}\`**, \`${p.points} pts\`)`,
        embed: null,
        tokens: {
            rsn: context.rsn,
            name: p.name,
            tier: p.tier,
            points: p.points,
            clanName: context.clanName ?? "",
        },
    };
};

export const renderCombatAchievementsSnapshot: Renderer = ({ payload, context }) => {
    const p = payload as CASnapshotPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY_ROLLUP).unicode,
        category: CATEGORY_ROLLUP,
        subject: null,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** \`${p.totalCompleted}\` completed`,
        embed: null,
        tokens: { rsn: context.rsn, totalCompleted: p.totalCompleted, clanName: context.clanName ?? "" },
    };
};
