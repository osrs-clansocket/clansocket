import {
    button,
    derived,
    div,
    icon,
    image,
    span,
    wireChange,
    type Instance,
    type ReactiveValue,
} from "../../../factory";
import { checkbox } from "../../../factory/content-ops/form/inputs/checkbox.js";
import { textInput } from "../../../factory/content-ops/form/inputs/text-input.js";
import { buildGlassColor } from "../../../forms/glass/inputs/glass-color.js";
import { buildGlassSelect, type SelectOption } from "../../../forms/glass/inputs/glass-select.js";
import { FORM_INPUT } from "../../../forms/form-classes.js";
import { PERMISSION_FLAG_NAMES } from "../../../../shared/constants/clan-manage-discord/permission-flags-constants.js";
import { formatPermissionName, safeBigInt } from "../util/permission-cycle.js";
import {
    channelNameOr,
    guildDataVersion,
    listChannels,
    listMembers,
    listRoles,
    memberDisplayOr,
    roleNameOr,
} from "../../../../state/discord/guild-state-cache.js";
import {
    DISCORD_INSPECTOR_COPY_BTN_CLASS,
    DISCORD_INSPECTOR_LABEL_ROW_CLASS,
    DISCORD_INSPECTOR_SECTION_CLASS,
    DISCORD_INSPECTOR_VALUE_CLASS,
    PANEL_LABEL_CLASS,
} from "../../../../shared/constants/clan-manage-discord/route-constants.js";

const COPY_ICON_NAME = "clipboard";
const IMAGE_PREVIEW_CLASS = "discord-inspector-image-preview";
const PERMS_GRID_CLASS = "discord-inspector-perms-grid";
const PERMS_ROW_CLASS = "discord-inspector-perms-row";
const PERMS_LABEL_CLASS = "discord-inspector-perms-row-label";
const PERMS_STATE_CLASS = "discord-inspector-perms-row-state";
const NONE_VALUE = "—";
const NONE_OPTION_LABEL = "— none —";
const HIDDEN_INPUT_SELECTOR = "input[type='hidden']";
const PERM_STATE_SET = "✓";
const PERM_STATE_UNSET = "—";
const DISCORD_CHANNEL_TYPE_TEXT = 0;
const DISCORD_CHANNEL_TYPE_VOICE = 2;

export interface ReadonlyEntry {
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

export function buildLabelRow(title: string, trailing: Instance | null): Instance {
    const children: Instance[] = [span({ classes: [PANEL_LABEL_CLASS], text: title, context: null, meta: null })];
    if (trailing) children.push(trailing);
    return div({ classes: [DISCORD_INSPECTOR_LABEL_ROW_CLASS], context: null, meta: null }, children);
}

export function buildReadonlySection(e: ReadonlyEntry): Instance {
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(e.title, buildCopyButton(e)),
        span({ classes: [DISCORD_INSPECTOR_VALUE_CLASS], text: e.value, context: null, meta: null }),
    ]);
}

export function buildEditableTextSection(
    title: string,
    currentValue: string,
    onSave: (next: string) => void,
): Instance {
    const inp = textInput({ classes: [FORM_INPUT], value: currentValue, context: null, meta: null });
    wireChange(inp.el, () => onSave(inp.el.value));
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, null),
        inp,
    ]);
}

export function buildEditableCheckSection(
    title: string,
    currentValue: boolean,
    onSave: (next: boolean) => void,
): Instance {
    const cb = checkbox({ context: null, meta: null });
    if (currentValue) cb.el.checked = true;
    wireChange(cb.el, () => onSave(cb.el.checked));
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, null),
        cb,
    ]);
}

export function buildEditableColorSection(
    title: string,
    currentHex: string,
    onSave: (nextHex: string) => void,
): Instance {
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

export function buildImageUrlReadonlySection(title: string, url: string | null): Instance {
    if (url === null || url.length === 0) {
        return buildReadonlySection({ title, value: NONE_VALUE });
    }
    const entry: ReadonlyEntry = { title, value: url };
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, buildCopyButton(entry)),
        image({
            src: url,
            alt: title,
            classes: [IMAGE_PREVIEW_CLASS],
            context: `preview of ${title}`,
            meta: ["data"],
        }),
        span({ classes: [DISCORD_INSPECTOR_VALUE_CLASS], text: url, context: null, meta: null }),
    ]);
}

function slugify(s: string): string {
    return s.toLowerCase().split(" ").join("-");
}

function buildEditableIdPickerSection(
    title: string,
    options: SelectOption[],
    current: string | null,
    onSave: (next: string | null) => void,
    allowEmpty: boolean,
): Instance {
    const finalOptions = allowEmpty ? [{ value: "", label: NONE_OPTION_LABEL }, ...options] : options;
    const slug = slugify(title);
    const selectId = `discord-inspector-${slug}`;
    const select = buildGlassSelect(selectId, finalOptions, current ?? "");
    const hidden = select.el.querySelector<HTMLInputElement>(HIDDEN_INPUT_SELECTOR);
    if (hidden !== null) {
        wireChange(hidden, () => {
            const val = hidden.value;
            onSave(val.length === 0 ? null : val);
        });
    }
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, null),
        select,
    ]);
}

export function buildEditableChannelPickerSection(
    title: string,
    guildId: string,
    currentChannelId: string | null,
    onSave: (next: string | null) => void,
    allowEmpty = true,
): Instance {
    const opts: SelectOption[] = listChannels(guildId).map((c) => ({
        value: c.channel_id,
        label: c.name ?? c.channel_id,
    }));
    return buildEditableIdPickerSection(title, opts, currentChannelId, onSave, allowEmpty);
}

function buildEditableChannelPickerByType(
    title: string,
    guildId: string,
    currentChannelId: string | null,
    onSave: (next: string | null) => void,
    typeFilter: number,
): Instance {
    const opts: SelectOption[] = listChannels(guildId)
        .filter((c) => c.type === typeFilter)
        .map((c) => ({ value: c.channel_id, label: c.name ?? c.channel_id }));
    return buildEditableIdPickerSection(title, opts, currentChannelId, onSave, true);
}

export function buildEditableTextChannelPickerSection(
    title: string,
    guildId: string,
    currentChannelId: string | null,
    onSave: (next: string | null) => void,
): Instance {
    return buildEditableChannelPickerByType(title, guildId, currentChannelId, onSave, DISCORD_CHANNEL_TYPE_TEXT);
}

export function buildEditableVoiceChannelPickerSection(
    title: string,
    guildId: string,
    currentChannelId: string | null,
    onSave: (next: string | null) => void,
): Instance {
    return buildEditableChannelPickerByType(title, guildId, currentChannelId, onSave, DISCORD_CHANNEL_TYPE_VOICE);
}

export function buildEditableRolePickerSection(
    title: string,
    guildId: string,
    currentRoleId: string | null,
    onSave: (next: string | null) => void,
    allowEmpty = true,
): Instance {
    const opts: SelectOption[] = listRoles(guildId).map((r) => ({
        value: r.role_id,
        label: r.name,
    }));
    return buildEditableIdPickerSection(title, opts, currentRoleId, onSave, allowEmpty);
}

export function buildEditableMemberPickerSection(
    title: string,
    guildId: string,
    currentUserId: string | null,
    onSave: (next: string | null) => void,
    allowEmpty = true,
): Instance {
    const opts: SelectOption[] = listMembers(guildId).map((m) => ({
        value: m.user_id,
        label: m.display_name ?? m.name,
    }));
    return buildEditableIdPickerSection(title, opts, currentUserId, onSave, allowEmpty);
}

export function buildEditableEnumSection(
    title: string,
    options: readonly SelectOption[],
    current: string,
    onSave: (next: string) => void,
): Instance {
    return buildEditableIdPickerSection(title, [...options], current, (v) => onSave(v ?? ""), false);
}

export function buildPairedChannelSection(label: string, guildId: string, channelId: string | null): Instance[] {
    if (channelId === null || channelId.length === 0) {
        return [buildReadonlySection({ title: label, value: NONE_VALUE })];
    }
    return [
        buildReadonlySection({
            title: label,
            value: derived(() => {
                guildDataVersion();
                return channelNameOr(guildId, channelId, channelId);
            }),
        }),
        buildReadonlySection({ title: `${label} ID`, value: channelId }),
    ];
}

export function buildPairedRoleSection(label: string, guildId: string, roleId: string | null): Instance[] {
    if (roleId === null || roleId.length === 0) {
        return [buildReadonlySection({ title: label, value: NONE_VALUE })];
    }
    return [
        buildReadonlySection({
            title: label,
            value: derived(() => {
                guildDataVersion();
                return roleNameOr(guildId, roleId, roleId);
            }),
        }),
        buildReadonlySection({ title: `${label} ID`, value: roleId }),
    ];
}

export function buildPairedMemberSection(label: string, guildId: string, userId: string | null): Instance[] {
    if (userId === null || userId.length === 0) {
        return [buildReadonlySection({ title: label, value: NONE_VALUE })];
    }
    return [
        buildReadonlySection({
            title: label,
            value: derived(() => {
                guildDataVersion();
                return memberDisplayOr(guildId, userId, userId);
            }),
        }),
        buildReadonlySection({ title: `${label} ID`, value: userId }),
    ];
}

export function buildPermissionsBitfieldSection(
    title: string,
    currentBitfield: string,
    editable: boolean,
    onSave: (next: string) => void,
): Instance {
    let local = safeBigInt(currentBitfield);
    const rows = PERMISSION_FLAG_NAMES.map((name, bit) => {
        const mask = 1n << BigInt(bit);
        const flagLabel = formatPermissionName(name);
        const labelEl = span({ classes: [PERMS_LABEL_CLASS], text: flagLabel, context: null, meta: null });
        if (!editable) {
            const isSet = (local & mask) !== 0n;
            const stateEl = span({
                classes: [PERMS_STATE_CLASS],
                text: isSet ? PERM_STATE_SET : PERM_STATE_UNSET,
                context: null,
                meta: null,
            });
            return div({ classes: [PERMS_ROW_CLASS], context: null, meta: null }, [stateEl, labelEl]);
        }
        const cb = checkbox({ context: null, meta: null });
        if ((local & mask) !== 0n) cb.el.checked = true;
        wireChange(cb.el, () => {
            local = cb.el.checked ? local | mask : local & ~mask;
            onSave(local.toString());
        });
        return div({ classes: [PERMS_ROW_CLASS], context: null, meta: null }, [cb, labelEl]);
    });
    return div({ classes: [DISCORD_INSPECTOR_SECTION_CLASS], context: null, meta: null }, [
        buildLabelRow(title, null),
        div({ classes: [PERMS_GRID_CLASS], context: null, meta: null }, rows),
    ]);
}
