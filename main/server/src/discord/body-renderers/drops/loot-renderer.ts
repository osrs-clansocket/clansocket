import { lookupCategoryEmoji } from "../../../shared/discord/category-emoji-lookup.js";
import type { Renderer } from "../renderer-types.js";
import { assembleCategoryUsername } from "../username-assembly.js";

interface LootItem {
    name: string;
    qty: number;
}

interface LootPayload {
    source: string;
    sourceLevel?: number | null;
    kc?: number | null;
    gp?: number | null;
    items: LootItem[];
}

const CATEGORY = "Loot";

function formatItems(items: readonly LootItem[]): string {
    return items.map((it) => (it.qty > 1 ? `${it.name} × ${it.qty}` : it.name)).join(", ");
}

const GP_THRESHOLD_BILLION = 1_000_000_000;
const GP_THRESHOLD_MILLION = 1_000_000;
const GP_THRESHOLD_THOUSAND = 1_000;
const GP_SHORT_PRECISION = 2;

function formatGp(gp: number | null | undefined): string {
    if (gp === null || gp === undefined) return "";
    return gp.toLocaleString("en-US");
}

function formatGpShort(gp: number | null | undefined): string {
    if (gp === null || gp === undefined) return "";
    if (gp >= GP_THRESHOLD_BILLION) return `${(gp / GP_THRESHOLD_BILLION).toFixed(GP_SHORT_PRECISION)}B`;
    if (gp >= GP_THRESHOLD_MILLION) return `${(gp / GP_THRESHOLD_MILLION).toFixed(GP_SHORT_PRECISION)}M`;
    if (gp >= GP_THRESHOLD_THOUSAND) return `${(gp / GP_THRESHOLD_THOUSAND).toFixed(GP_SHORT_PRECISION)}K`;
    return String(gp);
}

function buildSubject(p: LootPayload): string {
    return p.sourceLevel !== null && p.sourceLevel !== undefined ? `${p.source} - Lvl ${p.sourceLevel}` : p.source;
}

function buildContent(rsn: string, p: LootPayload, itemsText: string, gpText: string): string {
    const parts: string[] = [`**\`${rsn}\`** received ${itemsText}`];
    if (gpText.length > 0) parts.push(`Worth **\`${gpText} gp\`**`);
    if (p.kc !== null && p.kc !== undefined) parts.push(`**\`[KC ${p.kc}]\`**`);
    return parts.join(" - ");
}

export const renderLoot: Renderer = ({ payload, context }) => {
    const p = payload as LootPayload;
    const username = assembleCategoryUsername({
        emoji: lookupCategoryEmoji(CATEGORY).unicode,
        category: CATEGORY,
        subject: buildSubject(p),
        clanName: context.clanName,
    });
    const itemsText = formatItems(p.items);
    const gpText = formatGp(p.gp);
    const gpShortText = formatGpShort(p.gp);
    return {
        username,
        content: buildContent(context.rsn, p, itemsText, gpText),
        embed: null,
        tokens: {
            rsn: context.rsn,
            source: p.source,
            sourceLevel: p.sourceLevel ?? "",
            kc: p.kc ?? "",
            gp: gpText,
            gpShort: gpShortText,
            items: itemsText,
            clanName: context.clanName ?? "",
        },
    };
};
