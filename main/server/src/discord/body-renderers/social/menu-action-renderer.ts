import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface MenuActionPayload {
    action: string;
    option?: string | null;
    target?: string | null;
}

const CATEGORY = "Actions";
const SUBJECT = "last 10s";

export const renderMenuAction: Renderer = ({ payload, context }) => {
    const p = payload as MenuActionPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: SUBJECT,
        clanName: context.clanName,
    });
    const parts = [p.action];
    if (p.option !== null && p.option !== undefined && p.option.length > 0) parts.push(p.option);
    if (p.target !== null && p.target !== undefined && p.target.length > 0) parts.push(p.target);
    return {
        username,
        content: `**\`${context.rsn}\`** ${parts.join(" ")}`,
        embed: null,
        tokens: {
            rsn: context.rsn,
            action: p.action,
            option: p.option ?? "",
            target: p.target ?? "",
            clanName: context.clanName ?? "",
        },
    };
};
