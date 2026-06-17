import {
    BTN_VARIANT_BARE,
    BTN_VARIANT_CHIP,
    button,
    div,
    image,
    span,
    wireInput,
    type Instance,
} from "../../../../../../factory";
import { glassInput } from "../../../../../../forms/glass/inputs/glass-input.js";
import { createServerEmojisFeed } from "../../../../../../../state/discord/server-emojis/server-emojis-feed.js";
import type { DiscordServerEmoji } from "../../../../../../../state/discord/client.js";
import {
    listGuildEmojis,
    publicPathOrCdn,
    type DiscordEmojiEntry,
} from "../../../../../../../state/icons/discord-emojis-store.js";
import { getTokensForTrigger } from "../../../../../../../shared/constants/clan-manage-discord/token-list.js";
import {
    AUTO_HOOKS_EMOJI_CELL_CLASS,
    AUTO_HOOKS_EMOJI_GRID_CLASS,
    AUTO_HOOKS_EMOJI_PICKER_CLASS,
    AUTO_HOOKS_TOKEN_CHIPS_CLASS,
} from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";

const VARIABLE_EMOJI_EXCLUDE: ReadonlySet<string> = new Set([
    "rsn",
    "clanName",
    "wikiLink",
    "x",
    "y",
    "regionId",
    "varbitId",
    "message",
    "items",
    "option",
    "level",
    "count",
    "countOriginal",
    "sourceLevel",
    "gp",
    "gpShort",
    "kc",
    "itemCount",
    "completed",
    "total",
    "points",
    "totalCompleted",
    "value",
    "xpAtLevel",
    "streak",
    "discordRelativeTime",
    "discordTime",
    "discordDate",
    "discordDateTime",
    "dayOfWeek",
    "timeOfDay",
    "isoDate",
    "combatLevel",
    "totalLevel",
    "clanMemberCount",
]);

const UNICODE_EMOJIS: readonly { emoji: string; keywords: string }[] = [
    { emoji: "💰", keywords: "money loot drop coin" },
    { emoji: "🐾", keywords: "pet paw" },
    { emoji: "📈", keywords: "promote up trend" },
    { emoji: "📉", keywords: "demote down trend" },
    { emoji: "🚫", keywords: "kick ban no" },
    { emoji: "➕", keywords: "join add plus" },
    { emoji: "➖", keywords: "leave remove minus" },
    { emoji: "⭐", keywords: "level star" },
    { emoji: "📜", keywords: "quest scroll" },
    { emoji: "🏆", keywords: "achievement trophy" },
    { emoji: "📢", keywords: "broadcast loud announce" },
    { emoji: "☠️", keywords: "slayer death skull" },
    { emoji: "🗃️", keywords: "collection log" },
    { emoji: "🎖️", keywords: "combat achievement medal" },
    { emoji: "🏦", keywords: "bank" },
    { emoji: "📖", keywords: "diary book" },
    { emoji: "🗝️", keywords: "clue key" },
    { emoji: "💀", keywords: "death skull" },
    { emoji: "🎮", keywords: "actions game controller" },
    { emoji: "🌱", keywords: "farming plant seed" },
    { emoji: "🔥", keywords: "fire hot" },
    { emoji: "⚔️", keywords: "combat swords" },
    { emoji: "🛡️", keywords: "defense shield" },
    { emoji: "🏹", keywords: "range bow" },
    { emoji: "🪄", keywords: "magic wand" },
    { emoji: "💎", keywords: "gem rare" },
    { emoji: "👑", keywords: "leader crown owner" },
    { emoji: "❤️", keywords: "heart love" },
];

function matchesQuery(haystack: string, q: string): boolean {
    if (q.length === 0) return true;
    return haystack.toLowerCase().includes(q.toLowerCase());
}

function buildUnicodeCell(emoji: string, onInsert: (text: string) => void): Instance {
    return button({
        variant: BTN_VARIANT_BARE,
        classes: [AUTO_HOOKS_EMOJI_CELL_CLASS],
        text: emoji,
        ariaLabel: `Insert ${emoji}`,
        context: `insert the ${emoji} unicode emoji`,
        meta: ["action", "input"],
        onClick: () => onInsert(emoji),
    });
}

function buildImageCell(
    src: string,
    name: string,
    syntax: string,
    onInsert: (text: string) => void,
    titleAttr: string,
): Instance {
    const cell = button({
        variant: BTN_VARIANT_BARE,
        classes: [AUTO_HOOKS_EMOJI_CELL_CLASS],
        ariaLabel: `Insert ${titleAttr}`,
        context: `insert the ${titleAttr} emoji`,
        meta: ["action", "input"],
        onClick: () => onInsert(syntax),
    });
    cell.setChildren(image({ src, alt: name, classes: [], context: `${name} emoji thumbnail`, meta: ["data"] }));
    cell.setAttr("title", titleAttr);
    return cell;
}

function buildServerCell(em: DiscordServerEmoji, onInsert: (text: string) => void): Instance {
    const prefix = em.animated ? "a" : "";
    const syntax = `<${prefix}:${em.name}:${em.emoji_id}>`;
    if (em.image_url === null) {
        return button({
            variant: BTN_VARIANT_BARE,
            classes: [AUTO_HOOKS_EMOJI_CELL_CLASS],
            text: `:${em.name}:`,
            ariaLabel: `Insert :${em.name}:`,
            context: `insert the :${em.name}: server emoji`,
            meta: ["action", "input"],
            onClick: () => onInsert(syntax),
        });
    }
    return buildImageCell(em.image_url, em.name, syntax, onInsert, `:${em.name}: (server)`);
}

function buildAppCell(em: DiscordEmojiEntry, onInsert: (text: string) => void): Instance {
    const prefix = em.animated ? "a" : "";
    const syntax = `<${prefix}:${em.name}:${em.emoji_id}>`;
    return buildImageCell(publicPathOrCdn(em), em.name, syntax, onInsert, `:${em.name}: (bot)`);
}

function buildVariableChip(tokenName: string, label: string, onInsert: (text: string) => void): Instance {
    const insertText = `:{${tokenName}}:`;
    const btn = button({
        variant: BTN_VARIANT_CHIP,
        text: `:${tokenName}:`,
        ariaLabel: `Insert variable emoji for ${label}`,
        context: `inserts ${insertText} which resolves per-event to an emoji whose name matches the ${label} field value`,
        meta: ["action", "input"],
        onClick: () => onInsert(insertText),
    });
    btn.setAttr("title", `Variable emoji: ${insertText}`);
    return btn;
}

function buildVariableChips(triggerType: string, onInsert: (text: string) => void): readonly Instance[] {
    return getTokensForTrigger(triggerType)
        .map((t) => ({ name: t.token.slice(1, -1), label: t.label }))
        .filter((t) => !VARIABLE_EMOJI_EXCLUDE.has(t.name))
        .map((t) => buildVariableChip(t.name, t.label, onInsert));
}

export interface EmojiPickerOptions {
    guildId: string;
    getTriggerType: () => string;
    onInsert: (text: string) => void;
}

export function buildEmojiPicker(opts: EmojiPickerOptions): Instance {
    const { guildId, getTriggerType, onInsert } = opts;
    const variablesRow = div({ classes: [AUTO_HOOKS_TOKEN_CHIPS_CLASS], context: null, meta: null });
    const grid = div({ classes: [AUTO_HOOKS_EMOJI_GRID_CLASS], context: null, meta: null });
    let server: readonly DiscordServerEmoji[] = [];
    let appEmojis: readonly DiscordEmojiEntry[] = [];
    let query = "";

    function rerender(): void {
        variablesRow.setChildren(...buildVariableChips(getTriggerType(), onInsert));
        const unicode = UNICODE_EMOJIS.filter((u) => matchesQuery(u.keywords + " " + u.emoji, query)).map((u) =>
            buildUnicodeCell(u.emoji, onInsert),
        );
        const serverCells = server
            .filter((em) => matchesQuery(em.name, query))
            .map((em) => buildServerCell(em, onInsert));
        const appCells = appEmojis.filter((em) => matchesQuery(em.name, query)).map((em) => buildAppCell(em, onInsert));
        grid.setChildren(...unicode, ...appCells, ...serverCells);
    }

    void listGuildEmojis(guildId).then((list) => {
        appEmojis = list;
        rerender();
    });

    const feed = createServerEmojisFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            server = snap.rows as DiscordServerEmoji[];
            rerender();
        },
        (batch) => {
            const byKey = new Map(server.map((e) => [e.emoji_id, e]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordServerEmoji);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            server = [...byKey.values()];
            rerender();
        },
    );

    const searchInp = glassInput({
        placeholder: "Search emojis…",
        ariaLabel: "Search emojis",
        context: "filter the emoji grid by name or keyword",
        meta: ["input"],
    });
    wireInput(searchInp.el, () => {
        query = searchInp.el.value;
        rerender();
    });

    const variablesLabel = span({
        classes: [],
        text: "Variable emojis (resolve per-event)",
        context: null,
        meta: null,
    });
    variablesLabel.el.style.fontSize = "var(--fs-3xs)";
    variablesLabel.el.style.color = "var(--base-graphite-300)";
    variablesLabel.el.style.textTransform = "uppercase";
    variablesLabel.el.style.letterSpacing = "var(--ls-snug)";
    variablesLabel.el.style.paddingBlockEnd = "var(--sp-0)";
    const root = div({ classes: [AUTO_HOOKS_EMOJI_PICKER_CLASS], context: null, meta: null }, [
        variablesLabel,
        variablesRow,
        searchInp,
        grid,
    ]);
    root.trackDispose({ dispose: () => unsubscribe() });
    rerender();
    return root;
}
