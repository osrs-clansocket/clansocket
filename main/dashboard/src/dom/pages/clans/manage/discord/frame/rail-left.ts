import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { anchor, div, type Instance } from "../../../../../factory";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import {
    BTN_CHIP_CLASS,
    DISCORD_RAIL_ITEM_PLACEHOLDER_CLASS,
    DISCORD_RAIL_LEFT_CLASS,
} from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";
import { IS_ACTIVE_CLASS } from "../../../../../../shared/constants/state-modifier-constants.js";

export interface RailItem {
    key: string;
    label: string;
    placeholder?: boolean;
}

function active(key: string, label: string): RailItem {
    return { key, label };
}

export const RAIL_ITEMS: ReadonlyArray<RailItem> = [
    active("channels", "Channels"),
    active("emojis", "Emojis"),
    active("roles", "Roles"),
    active("members", "Members"),
    active("server-emojis", "Server Emojis"),
    active("server-stickers", "Server Stickers"),
    active("server-settings", "Server Settings"),
    active("permissions", "Permissions"),
    active("byo-bot", "BYO Bot"),
    active("auto-hooks", "Auto-Hooks"),
];

export interface RailLeftOptions {
    slug: string;
    activeKey: string;
    labelOverrides?: Readonly<Record<string, string>>;
}

function itemClasses(item: RailItem, isActive: boolean): readonly string[] {
    const base = [BTN_CHIP_CLASS];
    if (item.placeholder === true) base.push(DISCORD_RAIL_ITEM_PLACEHOLDER_CLASS);
    if (isActive) base.push(IS_ACTIVE_CLASS);
    return base;
}

function buildItem(slug: string, item: RailItem, label: string, isActive: boolean): Instance {
    return anchor({
        href: `/clans/${slug}/manage/discord/${item.key}`,
        data: { route: "" },
        classes: itemClasses(item, isActive),
        text: label,
        context: `select the ${label} section in the discord management surface`,
        meta: ["action", "nav"],
    });
}

export function buildRailLeft(opts: RailLeftOptions): Instance {
    const overrides = opts.labelOverrides ?? {};
    const itemEls = RAIL_ITEMS.map((item) => {
        const label = overrides[item.key] ?? item.label;
        return buildItem(opts.slug, item, label, item.key === opts.activeKey);
    });
    return div({ classes: [GLASS_PANE_CLASS, DISCORD_RAIL_LEFT_CLASS], context: null, meta: null }, itemEls);
}
