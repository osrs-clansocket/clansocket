import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleClanChatUsername } from "../username-assembly.js";

interface ClanChatPayload {
    rank?: string | null;
    message: string;
}

export const renderClanChat: Renderer = ({ payload, context }) => {
    const p = payload as ClanChatPayload;
    const emojiHit = lookupCategoryEmoji(context.rsn);
    const username = assembleClanChatUsername({
        emoji: emojiHit.unicode,
        rsn: context.rsn,
        rank: p.rank ?? null,
        clanName: context.clanName,
    });
    return {
        username,
        content: p.message,
        embed: null,
        tokens: {
            rsn: context.rsn,
            rank: p.rank ?? "",
            message: p.message,
            clanName: context.clanName ?? "",
        },
    };
};
