import { derived, div, signal, span, type Instance } from "../../../factory";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import {
    fetchDiscordChannelPins,
    updateDiscordChannel,
    type DiscordChannel,
    type DiscordChannelPin,
    type DiscordChannelState,
} from "../../../../state/discord/client.js";
import { channelStateOf } from "../../../../state/discord/channels/mappers/state-mapper.js";
import { DISCORD_INSPECTOR_SECTION_CLASS } from "../../../../shared/constants/clan-manage-discord/route-constants.js";
import {
    buildEditableCheckSection,
    buildEditableTextSection,
    buildLabelRow,
    buildPairedChannelSection,
    buildReadonlySection,
} from "../builders/section-builder.js";

const TYPE_LABELS: Record<number, string> = {
    0: "text",
    2: "voice",
    4: "category",
    5: "announcement",
    10: "announcement thread",
    11: "public thread",
    12: "private thread",
    13: "stage",
    15: "forum",
    16: "media",
};
const TYPE_UNKNOWN = "?";
const CHANNEL_TYPE_VOICE = 2;
const CHANNEL_TYPE_CATEGORY = 4;
const CHANNEL_TYPE_STAGE = 13;
const CHANNEL_TYPE_ANNOUNCEMENT_THREAD = 10;
const CHANNEL_TYPE_PUBLIC_THREAD = 11;
const CHANNEL_TYPE_PRIVATE_THREAD = 12;
const ISO_DATE_END = 16;

function formatTimestamp(ms: number | null): string {
    if (ms === null) return "—";
    return new Date(ms).toISOString().slice(0, ISO_DATE_END).replace("T", " ");
}

function isThreadType(type: number): boolean {
    return (
        type === CHANNEL_TYPE_ANNOUNCEMENT_THREAD ||
        type === CHANNEL_TYPE_PUBLIC_THREAD ||
        type === CHANNEL_TYPE_PRIVATE_THREAD
    );
}

async function saveChannelPatch(channel: DiscordChannel, patch: Partial<DiscordChannelState>): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;
    const before = channelStateOf(channel);
    const after: DiscordChannelState = { ...before, ...patch };
    await updateDiscordChannel(channel.guild_id, channel.channel_id, {
        userId: session.id,
        before,
        after,
    });
}

const PIN_LIST_CLASS = "clans-manage__channel-pins-list";
const PIN_ITEM_CLASS = "clans-manage__channel-pin-item";
const PIN_META_CLASS = "clans-manage__channel-pin-meta";
const PIN_CONTENT_CLASS = "clans-manage__channel-pin-content";
const PIN_LOADING = "Loading pins…";
const PIN_NONE = "no pinned messages";
const CONTENT_PREVIEW_LIMIT = 280;

function truncateContent(s: string | null): string {
    if (s === null || s.length === 0) return "(no content)";
    if (s.length <= CONTENT_PREVIEW_LIMIT) return s;
    return `${s.slice(0, CONTENT_PREVIEW_LIMIT - 1)}…`;
}

function buildPinItem(p: DiscordChannelPin): Instance {
    const date = new Date(p.timestamp).toISOString().slice(0, 16).replace("T", " ");
    const author = p.author_name ?? p.author_user_id ?? "unknown";
    return div({ classes: [PIN_ITEM_CLASS], context: null, meta: null }, [
        span({
            classes: [PIN_META_CLASS],
            text: `${author} · ${date}`,
            context: null,
            meta: null,
        }),
        span({
            classes: [PIN_CONTENT_CLASS],
            text: truncateContent(p.content),
            context: null,
            meta: null,
        }),
    ]);
}

function buildPinsSection(channel: DiscordChannel): Instance {
    const pinsSig = signal<readonly DiscordChannelPin[] | null>(null);
    const listHost = div({ classes: [PIN_LIST_CLASS], context: null, meta: null }, [
        span({
            classes: [PIN_META_CLASS],
            text: derived(() => {
                const pins = pinsSig();
                if (pins === null) return PIN_LOADING;
                if (pins.length === 0) return PIN_NONE;
                return `${pins.length} pinned`;
            }),
            context: null,
            meta: null,
        }),
    ]);
    void fetchDiscordChannelPins(channel.guild_id, channel.channel_id).then((pins) => {
        pinsSig.set(pins);
        if (pins.length === 0) return;
        const items = pins.map(buildPinItem);
        listHost.setChildren(
            span({
                classes: [PIN_META_CLASS],
                text: `${pins.length} pinned`,
                context: null,
                meta: null,
            }),
            ...items,
        );
    });
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow("Pinned messages", null),
        listHost,
    ]);
}

export function channelSections(channel: DiscordChannel): Instance[] {
    const isCategory = channel.type === CHANNEL_TYPE_CATEGORY;
    const isVoiceOrStage = channel.type === CHANNEL_TYPE_VOICE || channel.type === CHANNEL_TYPE_STAGE;
    const hasTopicAndNsfw = !isCategory && !isVoiceOrStage;
    const out: Instance[] = [
        buildEditableTextSection("Name", channel.name ?? "", (next) => void saveChannelPatch(channel, { name: next })),
        buildReadonlySection({ title: "ID", value: channel.channel_id }),
        buildReadonlySection({ title: "Type", value: TYPE_LABELS[channel.type] ?? TYPE_UNKNOWN }),
        buildReadonlySection({ title: "Position", value: String(channel.position ?? 0) }),
    ];
    if (!isCategory) {
        out.push(...buildPairedChannelSection("Parent", channel.guild_id, channel.parent_id));
    }
    if (hasTopicAndNsfw) {
        out.push(
            buildEditableTextSection(
                "Topic",
                channel.topic ?? "",
                (next) => void saveChannelPatch(channel, { topic: next.length > 0 ? next : null }),
            ),
        );
        out.push(
            buildEditableCheckSection("NSFW", channel.nsfw, (next) => void saveChannelPatch(channel, { nsfw: next })),
        );
    }
    if (channel.rate_limit_per_user !== null) {
        out.push(
            buildReadonlySection({
                title: "Slowmode (seconds)",
                value: String(channel.rate_limit_per_user),
            }),
        );
    }
    if (isVoiceOrStage) {
        if (channel.bitrate !== null) {
            out.push(buildReadonlySection({ title: "Bitrate (bps)", value: String(channel.bitrate) }));
        }
        if (channel.user_limit !== null) {
            out.push(
                buildReadonlySection({
                    title: "User limit",
                    value: channel.user_limit === 0 ? "unlimited" : String(channel.user_limit),
                }),
            );
        }
    }
    if (!isCategory && !isThreadType(channel.type)) {
        out.push(buildPinsSection(channel));
    }
    if (isThreadType(channel.type)) {
        if (channel.thread_archived !== null) {
            out.push(buildReadonlySection({ title: "Archived", value: channel.thread_archived ? "yes" : "no" }));
        }
        if (channel.thread_locked !== null) {
            out.push(buildReadonlySection({ title: "Locked", value: channel.thread_locked ? "yes" : "no" }));
        }
        if (channel.thread_auto_archive_duration !== null) {
            out.push(
                buildReadonlySection({
                    title: "Auto-archive (minutes)",
                    value: String(channel.thread_auto_archive_duration),
                }),
            );
        }
        if (channel.thread_archive_timestamp !== null) {
            out.push(
                buildReadonlySection({
                    title: "Archived at",
                    value: formatTimestamp(channel.thread_archive_timestamp),
                }),
            );
        }
        if (channel.thread_message_count !== null) {
            out.push(
                buildReadonlySection({
                    title: "Message count",
                    value: String(channel.thread_message_count),
                }),
            );
        }
    }
    return out;
}
