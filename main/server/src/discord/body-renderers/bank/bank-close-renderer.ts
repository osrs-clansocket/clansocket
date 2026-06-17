import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface BankCloseItem {
    name: string;
    delta: number;
}

interface BankClosePayload {
    durationMs?: number | null;
    items?: BankCloseItem[];
}

const CATEGORY = "Bank";
const SUBJECT = "closed";
const MAX_LINES = 20;

function formatDelta(delta: number): string {
    if (delta > 0) return `+ ${delta}`;
    if (delta < 0) return `- ${-delta}`;
    return `  ${delta}`;
}

function buildDiffBlock(items: readonly BankCloseItem[]): string {
    const lines = items.slice(0, MAX_LINES).map((it) => `${formatDelta(it.delta)}  ${it.name}`);
    return `\`\`\`diff\n${lines.join("\n")}\n\`\`\``;
}

export const renderBankClose: Renderer = ({ payload, context }) => {
    const p = payload as BankClosePayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: SUBJECT,
        clanName: context.clanName,
    });
    const items = p.items ?? [];
    const content =
        items.length === 0
            ? `**\`${context.rsn}\`** closed bank (no changes)`
            : `**\`${context.rsn}\`** closed bank\n${buildDiffBlock(items)}`;
    return {
        username,
        content,
        embed: null,
        tokens: {
            rsn: context.rsn,
            durationMs: p.durationMs ?? "",
            itemCount: items.length,
            clanName: context.clanName ?? "",
        },
    };
};
