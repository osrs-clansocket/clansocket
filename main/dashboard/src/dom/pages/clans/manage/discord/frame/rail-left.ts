import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { button, div, effect, signal, type Instance } from "../../../../../factory";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import {
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

function placeholder(key: string, label: string): RailItem {
    return { key, label, placeholder: true };
}

export const RAIL_ITEMS: ReadonlyArray<RailItem> = [
    active("server", "Server"),
    active("emojis", "Emojis"),
    active("channels", "Channels"),
    active("roles", "Roles"),
    placeholder("permissions", "Permissions"),
    placeholder("server-settings", "Server Settings"),
    placeholder("webhooks", "Webhooks"),
    placeholder("auto-messages", "Auto-Messages"),
    placeholder("presets", "Presets"),
];

export interface RailLeftOptions {
    initialKey: string;
    onSelect: (key: string) => void;
    labelOverrides?: Readonly<Record<string, string>>;
}

function itemClasses(item: RailItem): readonly string[] {
    return item.placeholder === true ? [DISCORD_RAIL_ITEM_PLACEHOLDER_CLASS] : [];
}

function buildItem(item: RailItem, label: string, onClick: () => void): Instance {
    return button({
        variant: "chip",
        classes: itemClasses(item),
        text: label,
        context: `select the ${label} section in the discord management surface`,
        meta: ["action", "nav"],
        onClick,
    });
}

export function buildRailLeft(opts: RailLeftOptions): Instance {
    const activeKeySig = signal(opts.initialKey);
    const itemRefs = new Map<string, Instance>();
    const overrides = opts.labelOverrides ?? {};

    const itemEls = RAIL_ITEMS.map((item) => {
        const label = overrides[item.key] ?? item.label;
        const inst = buildItem(item, label, () => {
            activeKeySig.set(item.key);
            opts.onSelect(item.key);
        });
        itemRefs.set(item.key, inst);
        return inst;
    });

    effect(() => {
        const current = activeKeySig();
        for (const [key, inst] of itemRefs) {
            inst.toggleClass(IS_ACTIVE_CLASS, key === current);
        }
    });

    return div({ classes: [GLASS_PANE_CLASS, DISCORD_RAIL_LEFT_CLASS], context: null, meta: null }, itemEls);
}
