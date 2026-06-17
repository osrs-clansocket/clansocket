import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface FarmingPatchPayload {
    regionId: number;
    varbitId: number;
    value: number;
}

const CATEGORY = "Farming";

export const renderFarmingPatch: Renderer = ({ payload, context }) => {
    const p = payload as FarmingPatchPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: `region ${p.regionId}`,
        clanName: context.clanName,
    });
    return {
        username,
        content: `**\`${context.rsn}\`** varbit \`${p.varbitId}\` = \`${p.value}\``,
        embed: null,
        tokens: {
            rsn: context.rsn,
            regionId: p.regionId,
            varbitId: p.varbitId,
            value: p.value,
            clanName: context.clanName ?? "",
        },
    };
};
