import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface ClueCompletedPayload {
    tier: string;
    total: number;
}

const CATEGORY = "Clue";

export const renderClueCompleted: Renderer = ({ payload, context }) => {
    const p = payload as ClueCompletedPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: p.tier,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** completed (total \`${p.total}\`)`,
        embed: null,
        tokens: { rsn: context.rsn, tier: p.tier, total: p.total, clanName: context.clanName ?? "" },
    };
};
