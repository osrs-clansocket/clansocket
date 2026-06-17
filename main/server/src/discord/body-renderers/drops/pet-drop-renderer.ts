import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface PetDropPayload {
    petName: string;
    trigger?: string | null;
    petItemId?: number | null;
}

const CATEGORY = "Pet";

export const renderPetDrop: Renderer = ({ payload, context }) => {
    const p = payload as PetDropPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: p.petName,
        clanName: context.clanName,
    });
    const trigger = p.trigger ?? "drop";
    return {
        username,
        content: `**\`${context.rsn}\`** got a pet (**\`${trigger}\`**)`,
        embed: null,
        tokens: {
            rsn: context.rsn,
            petName: p.petName,
            trigger,
            petItemId: p.petItemId ?? "",
            clanName: context.clanName ?? "",
        },
    };
};
