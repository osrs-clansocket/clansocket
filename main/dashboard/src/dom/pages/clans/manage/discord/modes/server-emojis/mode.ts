import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { button, div, effect, image, paragraph, type Instance } from "../../../../../../factory";
import { createServerEmojisFeed } from "../../../../../../../state/discord/server-emojis/server-emojis-feed.js";
import { selectDiscordItem } from "../../../../../../../state/discord/inspector-selection.js";
import { selectedDiscordItem } from "../../../../../../../state/discord/selected-item.js";
import type { DiscordServerEmoji } from "../../../../../../../state/discord/client.js";
import {
    DISCORD_EMOJI_GRID_CLASS,
    DISCORD_EMOJI_PANE_CLASS,
    DISCORD_EMOJI_TILE_ACTIVE_CLASS,
    DISCORD_EMOJI_TILE_CLASS,
    DISCORD_PANE_PLACEHOLDER_CLASS,
} from "../../../../../../../shared/constants/clan-manage-discord/route-constants.js";

const EMPTY_TEXT = "No server emojis in this guild yet.";
const TILE_IMAGE_CLASS = "clans-manage__discord-emoji-tile-image";

function buildTile(emoji: DiscordServerEmoji, tiles: Instance[]): Instance {
    const inst = button(
        {
            classes: [DISCORD_EMOJI_TILE_CLASS],
            ariaLabel: `:${emoji.name}:`,
            context: `select the ${emoji.name} server emoji to inspect or delete`,
            meta: ["choice", "discord", "emoji"],
            onClick: () => selectDiscordItem({ kind: "server-emoji", data: emoji }),
        },
        emoji.image_url !== null
            ? [
                  image({
                      src: emoji.image_url,
                      alt: `:${emoji.name}:`,
                      classes: [TILE_IMAGE_CLASS],
                      context: null,
                      meta: null,
                  }).el,
              ]
            : [],
    );
    inst.trackDispose(
        effect(() => {
            const sel = selectedDiscordItem();
            const isActive = sel?.kind === "server-emoji" && sel.data.emoji_id === emoji.emoji_id;
            inst.toggleClass(DISCORD_EMOJI_TILE_ACTIVE_CLASS, isActive);
        }),
    );
    tiles.push(inst);
    return inst;
}

function buildEmptyNode(): Instance {
    return paragraph({ classes: [DISCORD_PANE_PLACEHOLDER_CLASS], text: EMPTY_TEXT, context: null, meta: null });
}

function buildGridNode(emojis: readonly DiscordServerEmoji[], tiles: Instance[]): Instance {
    return div(
        { classes: [DISCORD_EMOJI_GRID_CLASS], context: null, meta: null },
        emojis.map((e) => buildTile(e, tiles)),
    );
}

function disposeTiles(tiles: Instance[]): void {
    for (const t of tiles) t.destroy();
    tiles.length = 0;
}

function sortedByName(emojis: readonly DiscordServerEmoji[]): DiscordServerEmoji[] {
    return [...emojis].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildServerEmojisMode(guildId: string): Instance {
    const tiles: Instance[] = [];
    const pane = div({ classes: [DISCORD_EMOJI_PANE_CLASS], context: null, meta: null }, [buildEmptyNode()]);
    let latest: readonly DiscordServerEmoji[] = [];

    function rerender(): void {
        disposeTiles(tiles);
        if (latest.length === 0) {
            pane.setChildren(buildEmptyNode());
            return;
        }
        pane.setChildren(buildGridNode(sortedByName(latest), tiles));
    }

    const feed = createServerEmojisFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            latest = snap.rows as DiscordServerEmoji[];
            rerender();
        },
        (batch) => {
            const byKey = new Map(latest.map((e) => [e.emoji_id, e]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordServerEmoji);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            latest = [...byKey.values()];
            rerender();
        },
    );

    pane.trackDispose({
        dispose: () => {
            disposeTiles(tiles);
            unsubscribe();
        },
    });
    return pane;
}
