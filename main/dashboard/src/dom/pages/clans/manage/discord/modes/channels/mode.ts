import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import {
    div,
    icon,
    panel,
    paragraph,
    treeView,
    TREE_ICON_CLASS,
    type Instance,
    type TreeNode,
} from "../../../../../../factory";
import { createChannelsFeed } from "../../../../../../../state/discord/channels/channels-feed.js";
import { channelStateOf } from "../../../../../../../state/discord/channels/mappers/state-mapper.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import {
    deleteDiscordChannel,
    updateDiscordChannel,
    type DiscordChannel,
    type DiscordServer,
} from "../../../../../../../state/discord/client.js";
import { selectDiscordItem } from "../../../../../../../state/discord/inspector-selection.js";
import { glassConfirm } from "../../../../../../forms/glass/modals/glass-confirm.js";
import { buildChannelCreateToolbar } from "./create-dropdown.js";

const EMPTY_TEXT = "No channels in this guild yet.";
const UNNAMED_FALLBACK = "(unnamed)";
const CATEGORY_TYPE = 4;
const EMPTY_CLASS = "clans-manage__discord-channels-empty";
const TOOLBAR_CLASS = "clans-manage__discord-channels-toolbar";

const TYPE_ICONS: Record<number, string> = {
    0: "hash",
    2: "volume-up",
    4: "folder",
    5: "megaphone",
    13: "broadcast",
    15: "chat-square-text",
    16: "image",
};
const FALLBACK_ICON = "question-circle";

function iconForType(type: number): Instance {
    return icon({
        name: TYPE_ICONS[type] ?? FALLBACK_ICON,
        classes: [TREE_ICON_CLASS],
        context: null,
        meta: null,
    });
}

function sortedByPosition<T extends { position: number | null }>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function parseFeatures(raw: string): readonly string[] {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === "string");
    } catch {
        return [];
    }
}

function channelRenameHandler(channel: DiscordChannel, guildId: string): (next: string) => Promise<boolean> {
    return async (next) => {
        const session = identityStore.session$();
        if (session === null) return false;
        const before = channelStateOf(channel);
        return updateDiscordChannel(guildId, channel.channel_id, {
            userId: session.id,
            before,
            after: { ...before, name: next },
        });
    };
}

async function confirmAndDeleteChannel(channel: DiscordChannel, guildId: string): Promise<void> {
    const channelName = channel.name ?? UNNAMED_FALLBACK;
    const isCategory = channel.type === CATEGORY_TYPE;
    const ok = await glassConfirm({
        title: isCategory ? "Delete category" : "Delete channel",
        message: isCategory
            ? `Delete category "${channelName}"? Channels inside will become uncategorized.`
            : `Delete #${channelName}? This cannot be undone.`,
        confirmLabel: "Delete",
        danger: true,
    });
    if (!ok) return;
    const session = identityStore.session$();
    if (session === null) return;
    await deleteDiscordChannel(guildId, channel.channel_id, {
        userId: session.id,
        channelName,
        channelType: channel.type,
    });
}

function leafFor(channel: DiscordChannel, guildId: string): TreeNode {
    const name = channel.name ?? UNNAMED_FALLBACK;
    return {
        kind: "leaf",
        key: channel.channel_id,
        label: name,
        icon: iconForType(channel.type),
        title: channel.topic ?? name,
        onClick: () => selectDiscordItem({ kind: "channel", data: channel }),
        onLabelEdit: channelRenameHandler(channel, guildId),
        actions: [
            {
                iconName: "trash",
                title: `Delete ${name}`,
                onClick: () => void confirmAndDeleteChannel(channel, guildId),
                danger: true,
            },
        ],
    };
}

function folderFor(
    category: DiscordChannel,
    children: readonly DiscordChannel[],
    expanded: Set<string>,
    toggle: (key: string) => void,
    guildId: string,
): TreeNode {
    const name = category.name ?? UNNAMED_FALLBACK;
    return {
        kind: "folder",
        key: category.channel_id,
        label: name,
        icon: iconForType(category.type),
        isExpanded: expanded.has(category.channel_id),
        children: sortedByPosition(children).map((c) => leafFor(c, guildId)),
        onLabelEdit: channelRenameHandler(category, guildId),
        actions: [
            {
                iconName: "trash",
                title: `Delete ${name}`,
                onClick: () => void confirmAndDeleteChannel(category, guildId),
                danger: true,
            },
        ],
        onToggle: () => {
            selectDiscordItem({ kind: "channel", data: category });
            toggle(category.channel_id);
        },
    };
}

function partitionChannels(channels: readonly DiscordChannel[]): {
    categories: DiscordChannel[];
    childrenByCat: Map<string, DiscordChannel[]>;
    orphans: DiscordChannel[];
} {
    const categories = channels.filter((c) => c.type === CATEGORY_TYPE);
    const catIds = new Set(categories.map((c) => c.channel_id));
    const childrenByCat = new Map<string, DiscordChannel[]>();
    const orphans: DiscordChannel[] = [];
    for (const ch of channels) {
        if (ch.type === CATEGORY_TYPE) continue;
        if (ch.parent_id !== null && catIds.has(ch.parent_id)) {
            const arr = childrenByCat.get(ch.parent_id) ?? [];
            arr.push(ch);
            childrenByCat.set(ch.parent_id, arr);
        } else {
            orphans.push(ch);
        }
    }
    return { categories, childrenByCat, orphans };
}

function buildTreeNodes(
    channels: readonly DiscordChannel[],
    expanded: Set<string>,
    toggle: (k: string) => void,
    guildId: string,
): TreeNode[] {
    const { categories, childrenByCat, orphans } = partitionChannels(channels);
    const out: TreeNode[] = [];
    for (const orphan of sortedByPosition(orphans)) out.push(leafFor(orphan, guildId));
    for (const cat of sortedByPosition(categories)) {
        out.push(folderFor(cat, childrenByCat.get(cat.channel_id) ?? [], expanded, toggle, guildId));
    }
    return out;
}

function buildToolbar(
    guildId: string,
    getChannels: () => readonly DiscordChannel[],
    features: readonly string[],
): Instance {
    void identityStore.refresh();
    return div({ classes: [TOOLBAR_CLASS], context: null, meta: null }, [
        buildChannelCreateToolbar({ guildId, getChannels, features }),
    ]);
}

export function buildChannelsMode(server: DiscordServer): Instance {
    const guildId = server.guild_id;
    const features = parseFeatures(server.features);
    const treeHost = div({ classes: [], context: null, meta: null });
    const empty = paragraph({
        classes: [EMPTY_CLASS],
        text: EMPTY_TEXT,
        hidden: "",
        context: null,
        meta: null,
    });
    const expanded = new Set<string>();
    let latest: readonly DiscordChannel[] = [];
    let initialized = false;

    function toggle(key: string): void {
        if (expanded.has(key)) expanded.delete(key);
        else expanded.add(key);
        rerender();
    }

    function rerender(): void {
        if (latest.length === 0) {
            treeHost.clear();
            empty.el.hidden = false;
            return;
        }
        if (!initialized) {
            for (const ch of latest) if (ch.type === CATEGORY_TYPE) expanded.add(ch.channel_id);
            initialized = true;
        }
        empty.el.hidden = true;
        treeHost.setChildren(treeView(buildTreeNodes(latest, expanded, toggle, guildId)));
    }

    const feed = createChannelsFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            latest = snap.rows as DiscordChannel[];
            rerender();
        },
        (batch) => {
            const byKey = new Map(latest.map((c) => [c.channel_id, c]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordChannel);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            latest = [...byKey.values()];
            rerender();
        },
    );

    const panelInst = panel({ context: null, meta: null }, [
        buildToolbar(guildId, () => latest, features),
        treeHost,
        empty,
    ]);
    panelInst.trackDispose({ dispose: () => unsubscribe() });
    return panelInst;
}
