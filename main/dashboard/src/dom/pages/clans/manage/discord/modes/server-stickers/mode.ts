import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { button, div, effect, image, paragraph, type Instance } from "../../../../../../factory";
import { createServerStickersFeed } from "../../../../../../../state/discord/server-stickers/server-stickers-feed.js";
import { selectDiscordItem } from "../../../../../../../state/discord/inspector-selection.js";
import { selectedDiscordItem } from "../../../../../../../state/discord/selected-item.js";
import type { DiscordServerSticker } from "../../../../../../../state/discord/client.js";
import {
    DISCORD_EMOJI_GRID_CLASS,
    DISCORD_EMOJI_PANE_CLASS,
    DISCORD_EMOJI_TILE_ACTIVE_CLASS,
    DISCORD_EMOJI_TILE_CLASS,
    DISCORD_PANE_PLACEHOLDER_CLASS,
} from "../../../../../../../shared/constants/clan-manage-discord/route-constants.js";

const EMPTY_TEXT = "No server stickers in this guild yet.";
const TILE_IMAGE_CLASS = "clans-manage__discord-emoji-tile-image";

function buildTile(sticker: DiscordServerSticker, tiles: Instance[]): Instance {
    const inst = button(
        {
            classes: [DISCORD_EMOJI_TILE_CLASS],
            ariaLabel: sticker.name,
            context: `select the ${sticker.name} server sticker to inspect or delete`,
            meta: ["choice", "discord", "emoji"],
            onClick: () => selectDiscordItem({ kind: "server-sticker", data: sticker }),
        },
        sticker.image_url !== null
            ? [
                  image({
                      src: sticker.image_url,
                      alt: sticker.name,
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
            const isActive = sel?.kind === "server-sticker" && sel.data.sticker_id === sticker.sticker_id;
            inst.toggleClass(DISCORD_EMOJI_TILE_ACTIVE_CLASS, isActive);
        }),
    );
    tiles.push(inst);
    return inst;
}

function buildEmptyNode(): Instance {
    return paragraph({ classes: [DISCORD_PANE_PLACEHOLDER_CLASS], text: EMPTY_TEXT, context: null, meta: null });
}

function buildGridNode(stickers: readonly DiscordServerSticker[], tiles: Instance[]): Instance {
    return div(
        { classes: [DISCORD_EMOJI_GRID_CLASS], context: null, meta: null },
        stickers.map((s) => buildTile(s, tiles)),
    );
}

function disposeTiles(tiles: Instance[]): void {
    for (const t of tiles) t.destroy();
    tiles.length = 0;
}

function sortedByName(stickers: readonly DiscordServerSticker[]): DiscordServerSticker[] {
    return [...stickers].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildServerStickersMode(guildId: string): Instance {
    const tiles: Instance[] = [];
    const pane = div({ classes: [DISCORD_EMOJI_PANE_CLASS], context: null, meta: null }, [buildEmptyNode()]);
    let latest: readonly DiscordServerSticker[] = [];

    function rerender(): void {
        disposeTiles(tiles);
        if (latest.length === 0) {
            pane.setChildren(buildEmptyNode());
            return;
        }
        pane.setChildren(buildGridNode(sortedByName(latest), tiles));
    }

    const feed = createServerStickersFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            latest = snap.rows as DiscordServerSticker[];
            rerender();
        },
        (batch) => {
            const byKey = new Map(latest.map((s) => [s.sticker_id, s]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordServerSticker);
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
