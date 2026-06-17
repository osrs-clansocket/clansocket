import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface SlayerPayload {
    count: number;
    countOriginal: number;
    targetName: string;
    masterName: string;
    streak?: number | null;
}

const CATEGORY = "Slayer";

export const renderSlayer: Renderer = ({ payload, context }) => {
    const p = payload as SlayerPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: p.masterName,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** \`${p.count}/${p.countOriginal}\` **\`${p.targetName}'s\`** remaining`,
        embed: null,
        tokens: {
            rsn: context.rsn,
            count: p.count,
            countOriginal: p.countOriginal,
            targetName: p.targetName,
            masterName: p.masterName,
            streak: p.streak ?? "",
            clanName: context.clanName ?? "",
        },
    };
};
