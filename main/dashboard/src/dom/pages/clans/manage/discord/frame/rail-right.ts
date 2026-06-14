import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import {
    button,
    derived,
    div,
    effect,
    icon,
    span,
    wireChange,
    type Instance,
    type ReactiveValue,
} from "../../../../../factory";
import { checkbox } from "../../../../../factory/content-ops/form/inputs/checkbox.js";
import { textInput } from "../../../../../factory/content-ops/form/inputs/text-input.js";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import {
    DISCORD_INSPECTOR_COPY_BTN_CLASS,
    DISCORD_INSPECTOR_LABEL_ROW_CLASS,
    DISCORD_INSPECTOR_SECTION_CLASS,
    DISCORD_INSPECTOR_VALUE_CLASS,
    DISCORD_RAIL_RIGHT_CLASS,
    PANEL_LABEL_CLASS,
} from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";
import { FORM_INPUT } from "../../../../../forms/form-classes.js";
import { buildGlassColor } from "../../../../../forms/glass/inputs/glass-color.js";
import { selectedEmojiName } from "../../../../../../state/discord/selected-emoji.js";
import { selectedDiscordItem } from "../../../../../../state/discord/selected-item.js";
import { discordEmojiEntry } from "../../../../../../state/icons/discord-emojis-store.js";
import { identityStore } from "../../../../../../state/identity/stores/identity-store.js";
import {
    updateDiscordChannel,
    updateDiscordRole,
    type DiscordChannel,
    type DiscordChannelState,
    type DiscordRole,
    type DiscordRoleState,
} from "../../../../../../state/discord/client.js";
import { channelStateOf } from "../../../../../../state/discord/channels/mappers/state-mapper.js";
import { roleStateOf } from "../../../../../../state/discord/roles/mappers/state-mapper.js";

const NONE_VALUE = "—";
const COPY_ICON_NAME = "clipboard";
const HEX_PADDING = 6;
const HEX_RADIX = 16;

const TYPE_LABELS: Record<number, string> = {
    0: "text",
    2: "voice",
    4: "category",
    5: "announcement",
    13: "stage",
    15: "forum",
    16: "media",
};
const TYPE_UNKNOWN = "?";
const CHANNEL_TYPE_VOICE = 2;
const CHANNEL_TYPE_CATEGORY = 4;
const CHANNEL_TYPE_STAGE = 13;

interface ReadonlyEntry {
    title: string;
    value: ReactiveValue<string>;
}

function readValue(v: ReactiveValue<string>): string {
    return typeof v === "function" ? (v as () => string)() : v;
}

function copyToClipboard(value: string): void {
    void navigator.clipboard.writeText(value).catch(() => undefined);
}

function buildCopyButton(e: ReadonlyEntry): Instance {
    return button(
        {
            classes: [DISCORD_INSPECTOR_COPY_BTN_CLASS],
            ariaLabel: `Copy ${e.title} to clipboard`,
            context: `copy ${e.title} value to clipboard`,
            meta: ["action", "copy"],
            onClick: () => copyToClipboard(readValue(e.value)),
        },
        [icon({ name: COPY_ICON_NAME, context: null, meta: null }).el],
    );
}

function buildLabelRow(title: string, trailing: Instance | null): Instance {
    const children: Instance[] = [span({ classes: [PANEL_LABEL_CLASS], text: title, context: null, meta: null })];
    if (trailing) children.push(trailing);
    return div({ classes: [DISCORD_INSPECTOR_LABEL_ROW_CLASS], context: null, meta: null }, children);
}

function buildReadonlySection(e: ReadonlyEntry): Instance {
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(e.title, buildCopyButton(e)),
        span({ classes: [DISCORD_INSPECTOR_VALUE_CLASS], text: e.value, context: null, meta: null }),
    ]);
}

function buildEditableTextSection(title: string, currentValue: string, onSave: (next: string) => void): Instance {
    const inp = textInput({ classes: [FORM_INPUT], value: currentValue, context: null, meta: null });
    wireChange(inp.el, () => onSave(inp.el.value));
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, null),
        inp,
    ]);
}

function buildEditableCheckSection(title: string, currentValue: boolean, onSave: (next: boolean) => void): Instance {
    const cb = checkbox({ context: null, meta: null });
    if (currentValue) cb.el.checked = true;
    wireChange(cb.el, () => onSave(cb.el.checked));
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, null),
        cb,
    ]);
}

function buildEditableColorSection(title: string, currentHex: string, onSave: (nextHex: string) => void): Instance {
    let local = currentHex;
    const colorInput = buildGlassColor({
        name: title.toLowerCase(),
        ariaLabel: title,
        value: () => local,
        onChange: (next) => {
            local = next;
            onSave(next);
        },
    });
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, null),
        colorInput,
    ]);
}

function intToHex(n: number): string {
    return `#${n.toString(HEX_RADIX).padStart(HEX_PADDING, "0")}`;
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

async function saveRolePatch(role: DiscordRole, patch: Partial<DiscordRoleState>): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;
    const before = roleStateOf(role);
    const after: DiscordRoleState = { ...before, ...patch };
    await updateDiscordRole(role.guild_id, role.role_id, {
        userId: session.id,
        before,
        after,
    });
}

function channelSections(channel: DiscordChannel): Instance[] {
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
        out.push(buildReadonlySection({ title: "Parent ID", value: channel.parent_id ?? NONE_VALUE }));
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
    return out;
}

function roleSections(role: DiscordRole): Instance[] {
    const editable = !role.managed;
    const sections: Instance[] = [];
    if (editable) {
        sections.push(buildEditableTextSection("Name", role.name, (next) => void saveRolePatch(role, { name: next })));
    } else {
        sections.push(buildReadonlySection({ title: "Name", value: role.name }));
    }
    sections.push(buildReadonlySection({ title: "ID", value: role.role_id }));
    if (editable) {
        sections.push(
            buildEditableColorSection("Color", intToHex(role.color), (nextHex) => {
                const colorInt = parseInt(nextHex.replace("#", ""), HEX_RADIX);
                if (Number.isNaN(colorInt)) return;
                void saveRolePatch(role, { color: colorInt });
            }),
        );
    } else {
        sections.push(buildReadonlySection({ title: "Color", value: intToHex(role.color) }));
    }
    sections.push(buildReadonlySection({ title: "Position", value: String(role.position) }));
    sections.push(buildReadonlySection({ title: "Permissions", value: role.permissions }));
    if (editable) {
        sections.push(
            buildEditableCheckSection(
                "Display separately",
                role.hoist,
                (next) => void saveRolePatch(role, { hoist: next }),
            ),
        );
        sections.push(
            buildEditableCheckSection(
                "Mentionable",
                role.mentionable,
                (next) => void saveRolePatch(role, { mentionable: next }),
            ),
        );
    } else {
        sections.push(buildReadonlySection({ title: "Display separately", value: role.hoist ? "yes" : "no" }));
        sections.push(buildReadonlySection({ title: "Mentionable", value: role.mentionable ? "yes" : "no" }));
    }
    sections.push(buildReadonlySection({ title: "Managed", value: role.managed ? "yes" : "no" }));
    return sections;
}

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
    if (item.kind === "channel") return `channel:${item.data.channel_id}`;
    return `role:${item.data.role_id}`;
}

function currentSections(): Instance[] {
    const item = selectedDiscordItem();
    if (item?.kind === "channel") return channelSections(item.data);
    if (item?.kind === "role") return roleSections(item.data);
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
        const item = selectedDiscordItem();
        const emoji = selectedEmojiName();
        const key = item ? itemKey(item) : emoji ? `emoji:${emoji}` : "none";
        if (key === lastKey) return;
        lastKey = key;
        sectionsHost.setChildren(...currentSections());
    });
    return wrapper;
}
