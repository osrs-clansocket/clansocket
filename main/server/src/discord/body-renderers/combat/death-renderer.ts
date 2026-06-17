import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface DeathPayload {
    x: number;
    y: number;
    plane: number;
    regionName?: string | null;
    causeName?: string | null;
}

const CATEGORY = "Death";

export const renderDeath: Renderer = ({ payload, context }) => {
    const p = payload as DeathPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: null,
        clanName: context.clanName,
    });
    const where = `(${p.x}, ${p.y}, ${p.plane})`;
    return {
        username,
        content: `**\`${context.rsn}\`** died at **\`${where}\`**`,
        embed: null,
        tokens: {
            rsn: context.rsn,
            x: p.x,
            y: p.y,
            plane: p.plane,
            regionName: p.regionName ?? "",
            causeName: p.causeName ?? "",
            clanName: context.clanName ?? "",
        },
    };
};
