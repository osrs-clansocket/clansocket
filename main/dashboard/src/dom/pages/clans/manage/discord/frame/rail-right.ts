import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { derived, div, effect, type Instance } from "../../../../../factory";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import { DISCORD_RAIL_RIGHT_CLASS } from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";
import { inspectorOverride$ } from "../../../../../../state/discord/inspector-override.js";
import { selectedEmojiName } from "../../../../../../state/discord/selected-emoji.js";
import { selectedDiscordItem } from "../../../../../../state/discord/selected-item.js";
import { discordEmojiEntry } from "../../../../../../state/icons/discord-emojis-store.js";
import { buildReadonlySection } from "../../../../../discord/inspector/builders/section-builder.js";
import { channelOverwriteSections } from "../../../../../discord/inspector/composers/channel-overwrite-section-composer.js";
import { channelSections } from "../../../../../discord/inspector/composers/channel-section-composer.js";
import { memberSections } from "../../../../../discord/inspector/composers/member-section-composer.js";
import { roleSections } from "../../../../../discord/inspector/composers/role-section-composer.js";
import { serverEmojiSections } from "../../../../../discord/inspector/composers/server-emoji-section-composer.js";
import { serverStickerSections } from "../../../../../discord/inspector/composers/server-sticker-section-composer.js";
import { webhookSections } from "../../../../../discord/inspector/composers/webhook-section-composer.js";

const NONE_VALUE = "—";

interface EmojiLike {
    emoji_id: string;
    name: string;
    animated: number | boolean;
}

function emojiField(picker: (e: EmojiLike) => string): string {
    const name = selectedEmojiName();
    if (!name) return NONE_VALUE;
    const entry = discordEmojiEntry(name);
    if (!entry) return NONE_VALUE;
    return picker(entry as EmojiLike);
}

function emojiSections(): Instance[] {
    return [
        buildReadonlySection({ title: "Name", value: derived(() => selectedEmojiName() ?? NONE_VALUE) }),
        buildReadonlySection({ title: "Emoji ID", value: derived(() => emojiField((e) => e.emoji_id)) }),
        buildReadonlySection({
            title: "Animated",
            value: derived(() => emojiField((e) => (e.animated ? "yes" : "no"))),
        }),
        buildReadonlySection({
            title: "Discord syntax",
            value: derived(() => emojiField((e) => `<${e.animated ? "a" : ""}:${e.name}:${e.emoji_id}>`)),
        }),
    ];
}

function itemKey(item: NonNullable<ReturnType<typeof selectedDiscordItem>>): string {
    switch (item.kind) {
        case "channel":
            return `channel:${item.data.channel_id}`;
        case "role":
            return `role:${item.data.role_id}`;
        case "member":
            return `member:${item.data.user_id}`;
        case "webhook":
            return `webhook:${item.data.webhook_id}`;
        case "server-emoji":
            return `server-emoji:${item.data.emoji_id}`;
        case "server-sticker":
            return `server-sticker:${item.data.sticker_id}`;
        case "channel-overwrite": {
            const o = item.data;
            const tid = o.kind === "role" ? o.role_id : o.user_id;
            return `channel-overwrite:${o.channel_id}:${tid}`;
        }
    }
}

function sectionsForItem(item: NonNullable<ReturnType<typeof selectedDiscordItem>>): Instance[] {
    switch (item.kind) {
        case "channel":
            return channelSections(item.data);
        case "role":
            return roleSections(item.data);
        case "member":
            return memberSections(item.data);
        case "webhook":
            return webhookSections(item.data);
        case "server-emoji":
            return serverEmojiSections(item.data);
        case "server-sticker":
            return serverStickerSections(item.data);
        case "channel-overwrite":
            return channelOverwriteSections(item.data);
    }
}

function currentSections(): Instance[] {
    const overrideFactory = inspectorOverride$();
    if (overrideFactory !== null) return overrideFactory();
    const item = selectedDiscordItem();
    if (item) return sectionsForItem(item);
    if (selectedEmojiName() !== null) return emojiSections();
    return [];
}

export function buildRailRight(): Instance {
    const sectionsHost = div({ classes: [], context: null, meta: null });
    const wrapper = div({ classes: [GLASS_PANE_CLASS, DISCORD_RAIL_RIGHT_CLASS], context: null, meta: null }, [
        sectionsHost,
    ]);
    let lastKey = "";
    effect(() => {
        const override = inspectorOverride$();
        const item = selectedDiscordItem();
        const emoji = selectedEmojiName();
        const key = override !== null ? "override" : item ? itemKey(item) : emoji ? `emoji:${emoji}` : "none";
        if (key === lastKey) return;
        lastKey = key;
        sectionsHost.setChildren(...currentSections());
    });
    return wrapper;
}
