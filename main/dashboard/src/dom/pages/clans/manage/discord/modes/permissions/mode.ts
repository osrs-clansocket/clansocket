import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import {
    BTN_VARIANT_BARE,
    button,
    derived,
    div,
    effect,
    icon,
    paragraph,
    signal,
    span,
    type Instance,
} from "../../../../../../factory";
import { label as labelEl } from "../../../../../../factory/content-ops/form/input-label.js";
import { FORM_ERROR, FORM_FIELD, FORM_FIELD_LABEL } from "../../../../../../forms/form-classes.js";
import { buildGlassSelect, type SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import { createChannelOverwritesFeed } from "../../../../../../../state/discord/channel-overwrites/channel-overwrites-feed.js";
import { inspectorOverride$ } from "../../../../../../../state/discord/inspector-override.js";
import {
    channelNameOr,
    guildDataVersion,
    listChannels,
    listMembers,
    listRoles,
    memberDisplayOr,
    roleNameOr,
} from "../../../../../../../state/discord/guild-state-cache.js";
import type { DiscordChannelOverwrite } from "../../../../../../../state/discord/client.js";
import { PERMISSION_FLAG_NAMES } from "../../../../../../../shared/constants/clan-manage-discord/permission-flags-constants.js";
import {
    addPermissionOverride,
    clearChannelFromPermission,
    clearTargetFromPermission,
    cycleChannelState,
    cycleTargetState,
    formatPermissionName,
    safeBigInt,
    targetIdOf,
    targetNameOf,
} from "../../../../../../discord/inspector/util/permission-cycle.js";

const HOST_CLASS = "clans-manage__permission-rows";
const HOVERED_CLASS = "permissions-hovered";
const RELATED_CLASS = "is-related";
const DROP_TARGET_CLASS = "is-drop-target";
const ROW_BLOCK_CLASS = "clans-manage__permission-row-block";
const ROW_CLASS = "clans-manage__permission-row";
const ROW_NAME_CLASS = "clans-manage__permission-row-name";
const ROW_ARROW_CLASS = "clans-manage__permission-row-arrow";
const ROW_SLOT_CLASS = "clans-manage__permission-row-slot";
const ROW_ADD_CLASS = "clans-manage__permission-row-add";
const SLIDE_PANEL_CLASS = "slide-panel__panel";
const SLIDE_PANEL_OPEN_CLASS = "slide-panel__panel--open";
const ADD_FORM_CLASS = "clans-manage__permission-add-form";
const ADD_FORM_ACTIONS_CLASS = "clans-manage__permission-add-form-actions";
const ADD_FORM_BTN_CLASS = "clans-manage__discord-toolbar-btn";
const CHIP_CLASS = "clans-manage__permission-chip";
const CHIP_MODIFIER_PREFIX = "clans-manage__permission-chip--";
const CHIP_LABEL_CLASS = "clans-manage__permission-chip-label";
const CHIP_REMOVE_CLASS = "clans-manage__permission-chip-remove";
const ACCORDION_CLASS = "clans-manage__permission-accordion";
const ACCORDION_HEADER_CLASS = "clans-manage__permission-accordion-header";
const ACCORDION_CHEVRON_CLASS = "clans-manage__permission-accordion-chevron";
const ACCORDION_BODY_CLASS = "clans-manage__permission-accordion-body";
const ACCORDION_OPEN_CLASS = "is-open";
const SWATCH_CLASS = "clans-manage__permission-swatch";
const ARROW_ICON_NAME = "arrow-right-short";
const CHEVRON_ICON_NAME = "chevron-right";
const ADD_ICON_NAME = "plus-lg";
const REMOVE_ICON_NAME = "x-lg";
const LOCK_ICON_NAME = "lock";
const LOCKED_MODIFIER = "is-locked";

interface RoleLevelChip {
    roleId: string;
    roleName: string;
}
const HIDDEN_INPUT_SELECTOR = "input[type='hidden']";
const DATA_PERM_BIT = "data-perm-bit";
const DATA_CHIP_TARGET = "data-chip-target";
const DATA_CHIP_CHANNEL = "data-chip-channel";
const CHIP_DATA_SELECTOR = "[data-chip-target], [data-chip-channel]";
const EVERYONE_NAME = "@everyone";

type ChipState = "allow" | "deny" | "mixed";
type Branch = "allow" | "deny";

interface TargetChip {
    kind: "role" | "member";
    targetId: string;
    targetName: string;
    state: ChipState;
}

interface ChannelChip {
    channelId: string;
    channelName: string;
    state: ChipState;
}

function readSelectValue(selectInst: Instance): string {
    const hidden = selectInst.el.querySelector<HTMLInputElement>(HIDDEN_INPUT_SELECTOR);
    return hidden?.value ?? "";
}

function aggregate(hasAllow: boolean, hasDeny: boolean): ChipState {
    if (hasAllow && hasDeny) return "mixed";
    if (hasAllow) return "allow";
    return "deny";
}

function targetChipsFor(rows: readonly DiscordChannelOverwrite[], bit: number): TargetChip[] {
    const mask = 1n << BigInt(bit);
    const map = new Map<
        string,
        { kind: "role" | "member"; targetId: string; targetName: string; hasAllow: boolean; hasDeny: boolean }
    >();
    for (const o of rows) {
        const inAllow = (safeBigInt(o.allow) & mask) !== 0n;
        const inDeny = (safeBigInt(o.deny) & mask) !== 0n;
        if (!inAllow && !inDeny) continue;
        const tid = targetIdOf(o);
        const key = `${o.kind}:${tid}`;
        let entry = map.get(key);
        if (!entry) {
            entry = {
                kind: o.kind,
                targetId: tid,
                targetName: targetNameOf(o),
                hasAllow: false,
                hasDeny: false,
            };
            map.set(key, entry);
        }
        if (inAllow) entry.hasAllow = true;
        if (inDeny) entry.hasDeny = true;
    }
    return [...map.values()]
        .map(
            (e): TargetChip => ({
                kind: e.kind,
                targetId: e.targetId,
                targetName: e.targetName,
                state: aggregate(e.hasAllow, e.hasDeny),
            }),
        )
        .sort((a, b) => a.targetName.localeCompare(b.targetName));
}

function channelChipsFor(guildId: string, rows: readonly DiscordChannelOverwrite[], bit: number): ChannelChip[] {
    const mask = 1n << BigInt(bit);
    const map = new Map<string, { channelId: string; channelName: string; hasAllow: boolean; hasDeny: boolean }>();
    for (const o of rows) {
        const inAllow = (safeBigInt(o.allow) & mask) !== 0n;
        const inDeny = (safeBigInt(o.deny) & mask) !== 0n;
        if (!inAllow && !inDeny) continue;
        let entry = map.get(o.channel_id);
        if (!entry) {
            entry = {
                channelId: o.channel_id,
                channelName: channelNameOr(guildId, o.channel_id, o.channel_id),
                hasAllow: false,
                hasDeny: false,
            };
            map.set(o.channel_id, entry);
        }
        if (inAllow) entry.hasAllow = true;
        if (inDeny) entry.hasDeny = true;
    }
    return [...map.values()]
        .map(
            (e): ChannelChip => ({
                channelId: e.channelId,
                channelName: e.channelName,
                state: aggregate(e.hasAllow, e.hasDeny),
            }),
        )
        .sort((a, b) => a.channelName.localeCompare(b.channelName));
}

function buildField(labelText: string, inputId: string, control: Instance): Instance {
    return div({ classes: [FORM_FIELD], id: inputId, context: null, meta: null }, [
        labelEl({
            classes: [FORM_FIELD_LABEL],
            text: labelText,
            htmlFor: inputId,
            context: null,
            meta: null,
        }),
        control,
    ]);
}

function buildAddForm(
    guildId: string,
    bit: number,
    getLatest: () => readonly DiscordChannelOverwrite[],
    onClose: () => void,
): Instance {
    const roleOptions: SelectOption[] = listRoles(guildId).map((r) => ({
        value: `role:${r.role_id}`,
        label: r.name,
    }));
    const memberOptions: SelectOption[] = listMembers(guildId).map((m) => ({
        value: `member:${m.user_id}`,
        label: m.display_name ?? m.name,
    }));
    const targetOptions: SelectOption[] = [...roleOptions, ...memberOptions];
    const channelOptions: SelectOption[] = listChannels(guildId).map((c) => ({
        value: c.channel_id,
        label: c.name ?? c.channel_id,
    }));
    const branchOptions: SelectOption[] = [
        { value: "allow", label: "ALLOW" },
        { value: "deny", label: "DENY" },
    ];

    const targetSelect = buildGlassSelect(`perm-add-target-${bit}`, targetOptions, targetOptions[0]?.value ?? "");
    const channelSelect = buildGlassSelect(`perm-add-channel-${bit}`, channelOptions, channelOptions[0]?.value ?? "");
    const branchSelect = buildGlassSelect(`perm-add-branch-${bit}`, branchOptions, "allow");

    const errorSig = signal<string>("");
    const errorEl = paragraph({
        classes: [FORM_ERROR],
        text: derived(() => errorSig()),
        hidden: "",
        context: null,
        meta: null,
    });

    const cancelBtn = button({
        classes: [ADD_FORM_BTN_CLASS],
        variant: BTN_VARIANT_BARE,
        text: "Cancel",
        ariaLabel: "Cancel add override",
        context: "cancel add-override slide panel",
        meta: ["action"],
        onClick: onClose,
    });
    const submitBtn = button({
        classes: [ADD_FORM_BTN_CLASS],
        variant: BTN_VARIANT_BARE,
        text: "Add",
        ariaLabel: "Add override",
        context: "submit add-override",
        meta: ["submit"],
    });

    let submitted = false;
    submitBtn.el.addEventListener("click", () => {
        void (async () => {
            if (submitted) return;
            submitted = true;
            submitBtn.el.disabled = true;
            try {
                const targetVal = readSelectValue(targetSelect);
                const channelId = readSelectValue(channelSelect);
                const branch = readSelectValue(branchSelect) as Branch;
                if (!targetVal || !channelId) {
                    errorSig.set("Pick target and channel.");
                    errorEl.el.hidden = false;
                    submitted = false;
                    submitBtn.el.disabled = false;
                    return;
                }
                const sep = targetVal.indexOf(":");
                const kind = targetVal.substring(0, sep) as "role" | "member";
                const tid = targetVal.substring(sep + 1);
                const tName = kind === "role" ? roleNameOr(guildId, tid, tid) : memberDisplayOr(guildId, tid, tid);
                const ok = await addPermissionOverride(guildId, getLatest(), channelId, kind, tid, tName, bit, branch);
                if (!ok) {
                    errorSig.set("Server rejected the change. Check role/channel selection.");
                    errorEl.el.hidden = false;
                    submitted = false;
                    submitBtn.el.disabled = false;
                    return;
                }
                onClose();
            } catch {
                errorSig.set("Failed to add override.");
                errorEl.el.hidden = false;
                submitted = false;
                submitBtn.el.disabled = false;
            }
        })();
    });

    return div({ classes: [ADD_FORM_CLASS], context: null, meta: null }, [
        buildField("Target", `perm-add-target-field-${bit}`, targetSelect),
        buildField("Channel", `perm-add-channel-field-${bit}`, channelSelect),
        buildField("Branch", `perm-add-branch-field-${bit}`, branchSelect),
        errorEl,
        div({ classes: [ADD_FORM_ACTIONS_CLASS], context: null, meta: null }, [cancelBtn, submitBtn]),
    ]);
}

const SVG_NS = "http://www.w3.org/2000/svg";
const OVERLAY_CLASS = "clans-manage__permission-wires";
const ROWS_LIST_CLASS = "clans-manage__permission-rows-list";
const WIRE_CLASS = "clans-manage__permission-wire";

const GUILD_ONLY_PERMISSIONS: ReadonlySet<string> = new Set([
    "KickMembers",
    "BanMembers",
    "Administrator",
    "ManageGuild",
    "ViewAuditLog",
    "ChangeNickname",
    "ManageNicknames",
    "ViewGuildInsights",
    "ModerateMembers",
    "ManageEmojisAndStickers",
    "ManageGuildExpressions",
    "CreateGuildExpressions",
    "ManageEvents",
    "CreateEvents",
    "ViewCreatorMonetizationAnalytics",
]);

function isGuildOnly(bit: number): boolean {
    const name = PERMISSION_FLAG_NAMES[bit];
    if (name === undefined) return false;
    return GUILD_ONLY_PERMISSIONS.has(name);
}

const NA_TEXT_CLASS = "clans-manage__permission-na-text";

let currentDragKind: "channel" | "role" | "member" | null = null;
let currentDragId: string | null = null;

function buildSwatch(kind: "channel" | "role" | "member", id: string, label: string): Instance {
    const swatch = div({ classes: [SWATCH_CLASS], title: `${kind}: ${label}`, context: null, meta: null }, [
        span({ classes: [], text: label, context: null, meta: null }),
    ]);
    swatch.setAttr("draggable", "true");
    swatch.el.addEventListener("dragstart", (e) => {
        currentDragKind = kind;
        currentDragId = id;
        if (e.dataTransfer === null) return;
        e.dataTransfer.setData("text/plain", `${kind}:${id}`);
        e.dataTransfer.effectAllowed = "copy";
    });
    swatch.el.addEventListener("dragend", () => {
        currentDragKind = null;
        currentDragId = null;
    });
    return swatch;
}

function isValidDropForSlot(
    slotKind: "roles" | "channels",
    bit: number,
    latest: readonly DiscordChannelOverwrite[],
): boolean {
    if (currentDragKind === null || currentDragId === null) return false;
    if (isGuildOnly(bit)) return false;
    const mask = 1n << BigInt(bit);
    if (slotKind === "roles") {
        if (currentDragKind !== "role" && currentDragKind !== "member") return false;
        for (const o of latest) {
            if (((safeBigInt(o.allow) | safeBigInt(o.deny)) & mask) === 0n) continue;
            if (o.kind === currentDragKind && targetIdOf(o) === currentDragId) return false;
        }
        return true;
    }
    if (currentDragKind !== "channel") return false;
    for (const o of latest) {
        if (((safeBigInt(o.allow) | safeBigInt(o.deny)) & mask) === 0n) continue;
        if (o.channel_id === currentDragId) return false;
    }
    return true;
}

function buildAccordionShell(getLabel: () => string, body: Instance, title: string): Instance {
    const chevron = icon({ name: CHEVRON_ICON_NAME, classes: [ACCORDION_CHEVRON_CLASS], context: null, meta: null });
    const accordion = div({ classes: [ACCORDION_CLASS], context: null, meta: null });
    let isOpen = false;
    const header = button(
        {
            classes: [ACCORDION_HEADER_CLASS],
            variant: BTN_VARIANT_BARE,
            ariaLabel: `Toggle ${title} swatches`,
            context: `toggle ${title} accordion`,
            meta: ["action"],
            onClick: () => {
                isOpen = !isOpen;
                accordion.toggleClass(ACCORDION_OPEN_CLASS, isOpen);
            },
        },
        [chevron, span({ classes: [], text: derived(getLabel), context: null, meta: null })],
    );
    accordion.setChildren(header, body);
    return accordion;
}

function buildSwatchPanel(guildId: string): Instance[] {
    const channelsBody = div({ classes: [ACCORDION_BODY_CLASS], context: null, meta: null });
    const rolesBody = div({ classes: [ACCORDION_BODY_CLASS], context: null, meta: null });
    const membersBody = div({ classes: [ACCORDION_BODY_CLASS], context: null, meta: null });
    const channelsLabel = signal<string>("Channels (0)");
    const rolesLabel = signal<string>("Roles (0)");
    const membersLabel = signal<string>("Members (0)");
    const channelsAccordion = buildAccordionShell(() => channelsLabel(), channelsBody, "Channels");
    const rolesAccordion = buildAccordionShell(() => rolesLabel(), rolesBody, "Roles");
    const membersAccordion = buildAccordionShell(() => membersLabel(), membersBody, "Members");
    effect(() => {
        guildDataVersion();
        const cs = listChannels(guildId).map((c) => buildSwatch("channel", c.channel_id, c.name ?? c.channel_id));
        const rs = listRoles(guildId).map((r) => buildSwatch("role", r.role_id, r.name));
        const ms = listMembers(guildId).map((m) => buildSwatch("member", m.user_id, m.display_name ?? m.name));
        channelsBody.setChildren(...cs);
        rolesBody.setChildren(...rs);
        membersBody.setChildren(...ms);
        channelsLabel.set(`Channels (${cs.length})`);
        rolesLabel.set(`Roles (${rs.length})`);
        membersLabel.set(`Members (${ms.length})`);
    });
    return [channelsAccordion, rolesAccordion, membersAccordion];
}

export function buildPermissionsMode(guildId: string): Instance {
    const rowsList = div({ classes: [ROWS_LIST_CLASS], context: null, meta: null });
    const rowsHost = div({ classes: [HOST_CLASS], context: null, meta: null }, [rowsList]);
    let latest: readonly DiscordChannelOverwrite[] = [];

    const svgOverlay = document.createElementNS(SVG_NS, "svg");
    svgOverlay.classList.add(OVERLAY_CLASS);
    rowsHost.el.appendChild(svgOverlay);

    let hoverSource: HTMLElement | null = null;
    let hoverTargets: HTMLElement[] = [];

    function getLatest(): readonly DiscordChannelOverwrite[] {
        return latest;
    }

    function clearWires(): void {
        while (svgOverlay.firstChild !== null) {
            svgOverlay.removeChild(svgOverlay.firstChild);
        }
    }

    function drawWires(): void {
        clearWires();
        if (hoverSource === null || hoverTargets.length === 0) return;
        svgOverlay.style.width = `${rowsHost.el.scrollWidth}px`;
        svgOverlay.style.height = `${rowsHost.el.scrollHeight}px`;
        const hostRect = rowsHost.el.getBoundingClientRect();
        const scrollLeft = rowsHost.el.scrollLeft;
        const scrollTop = rowsHost.el.scrollTop;
        const sourceRect = hoverSource.getBoundingClientRect();
        const sx = sourceRect.left + sourceRect.width / 2 - hostRect.left + scrollLeft;
        const sy = sourceRect.top + sourceRect.height / 2 - hostRect.top + scrollTop;
        for (const t of hoverTargets) {
            if (t === hoverSource) continue;
            const tRect = t.getBoundingClientRect();
            const tx = tRect.left + tRect.width / 2 - hostRect.left + scrollLeft;
            const ty = tRect.top + tRect.height / 2 - hostRect.top + scrollTop;
            const line = document.createElementNS(SVG_NS, "line");
            line.setAttribute("class", WIRE_CLASS);
            line.setAttribute("x1", sx.toString());
            line.setAttribute("y1", sy.toString());
            line.setAttribute("x2", tx.toString());
            line.setAttribute("y2", ty.toString());
            svgOverlay.appendChild(line);
        }
    }

    function applyHover(sourceKind: "role" | "channel", sourceKey: string, sourceEl: HTMLElement): void {
        rowsHost.toggleClass(HOVERED_CLASS, true);
        const selectors = new Set<string>();
        if (sourceKind === "role") {
            selectors.add(`[${DATA_CHIP_TARGET}="${sourceKey}"]`);
            for (let bit = 0; bit < PERMISSION_FLAG_NAMES.length; bit++) {
                const mask = 1n << BigInt(bit);
                for (const o of latest) {
                    if (`${o.kind}:${targetIdOf(o)}` !== sourceKey) continue;
                    if (((safeBigInt(o.allow) | safeBigInt(o.deny)) & mask) === 0n) continue;
                    selectors.add(`[${DATA_PERM_BIT}="${bit}"][${DATA_CHIP_CHANNEL}="${o.channel_id}"]`);
                }
            }
        } else {
            selectors.add(`[${DATA_CHIP_CHANNEL}="${sourceKey}"]`);
            for (let bit = 0; bit < PERMISSION_FLAG_NAMES.length; bit++) {
                const mask = 1n << BigInt(bit);
                for (const o of latest) {
                    if (o.channel_id !== sourceKey) continue;
                    if (((safeBigInt(o.allow) | safeBigInt(o.deny)) & mask) === 0n) continue;
                    const targetKey = `${o.kind}:${targetIdOf(o)}`;
                    selectors.add(`[${DATA_PERM_BIT}="${bit}"][${DATA_CHIP_TARGET}="${targetKey}"]`);
                }
            }
        }
        if (selectors.size === 0) return;
        const sel = [...selectors].join(",");
        const matched = rowsHost.el.querySelectorAll<HTMLElement>(sel);
        matched.forEach((el) => el.classList.add(RELATED_CLASS));
        hoverSource = sourceEl;
        hoverTargets = Array.from(matched);
        drawWires();
    }

    function clearHover(): void {
        rowsHost.toggleClass(HOVERED_CLASS, false);
        rowsHost.el.querySelectorAll(`.${RELATED_CLASS}`).forEach((el) => {
            el.classList.remove(RELATED_CLASS);
        });
        hoverSource = null;
        hoverTargets = [];
        clearWires();
    }

    rowsHost.el.addEventListener("mouseover", (e) => {
        const target = e.target as HTMLElement | null;
        if (target === null) return;
        const chip = target.closest<HTMLElement>(CHIP_DATA_SELECTOR);
        if (chip === null) return;
        const targetKey = chip.getAttribute(DATA_CHIP_TARGET);
        if (targetKey !== null) {
            applyHover("role", targetKey, chip);
            return;
        }
        const channelKey = chip.getAttribute(DATA_CHIP_CHANNEL);
        if (channelKey !== null) {
            applyHover("channel", channelKey, chip);
        }
    });

    rowsHost.el.addEventListener("mouseout", (e) => {
        const target = e.target as HTMLElement | null;
        if (target === null) return;
        const chip = target.closest(CHIP_DATA_SELECTOR);
        if (chip === null) return;
        const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
        if (related !== null && related.closest(CHIP_DATA_SELECTOR) !== null) {
            clearHover();
            return;
        }
        clearHover();
    });

    rowsHost.el.addEventListener("scroll", () => {
        if (hoverSource !== null) drawWires();
    });

    async function handleDrop(
        slotKind: "roles" | "channels",
        swatchKind: string,
        id: string,
        bit: number,
    ): Promise<void> {
        if (slotKind === "roles") {
            if (swatchKind !== "role" && swatchKind !== "member") return;
            const channels = listChannels(guildId);
            if (channels.length === 0) return;
            const channelId = channels[0].channel_id;
            const tName = swatchKind === "role" ? roleNameOr(guildId, id, id) : memberDisplayOr(guildId, id, id);
            await addPermissionOverride(guildId, getLatest(), channelId, swatchKind, id, tName, bit, "allow");
        } else {
            if (swatchKind !== "channel") return;
            const roles = listRoles(guildId);
            const everyone = roles.find((r) => r.name === EVERYONE_NAME) ?? roles[0];
            if (!everyone) return;
            await addPermissionOverride(
                guildId,
                getLatest(),
                id,
                "role",
                everyone.role_id,
                everyone.name,
                bit,
                "allow",
            );
        }
    }

    function setupDropTarget(slotInst: Instance, slotKind: "roles" | "channels", bit: number): void {
        const el = slotInst.el;
        el.addEventListener("dragover", (e) => {
            if (!isValidDropForSlot(slotKind, bit, getLatest())) return;
            e.preventDefault();
            if (e.dataTransfer !== null) e.dataTransfer.dropEffect = "copy";
            slotInst.toggleClass(DROP_TARGET_CLASS, true);
        });
        el.addEventListener("dragleave", () => {
            slotInst.toggleClass(DROP_TARGET_CLASS, false);
        });
        el.addEventListener("drop", (e) => {
            if (!isValidDropForSlot(slotKind, bit, getLatest())) return;
            e.preventDefault();
            slotInst.toggleClass(DROP_TARGET_CLASS, false);
            const data = e.dataTransfer?.getData("text/plain") ?? "";
            if (data.length === 0) return;
            const sep = data.indexOf(":");
            if (sep < 0) return;
            const kind = data.substring(0, sep);
            const id = data.substring(sep + 1);
            void handleDrop(slotKind, kind, id, bit);
        });
    }

    function targetChipEl(t: TargetChip, bit: number, flagName: string): Instance {
        const permLabel = formatPermissionName(flagName);
        const chip = div(
            {
                classes: [CHIP_CLASS, `${CHIP_MODIFIER_PREFIX}${t.state}`],
                title: `${t.kind} ${t.targetName} (${t.state}) — click to cycle: allow → deny → inherit`,
                context: null,
                meta: null,
            },
            [
                span({
                    classes: [CHIP_LABEL_CLASS],
                    text: `${t.kind}: ${t.targetName}`,
                    context: null,
                    meta: null,
                }),
                button(
                    {
                        classes: [CHIP_REMOVE_CLASS],
                        variant: BTN_VARIANT_BARE,
                        ariaLabel: `Remove ${t.kind} ${t.targetName} from ${permLabel}`,
                        title: `clear all ${permLabel} overrides on ${t.kind} ${t.targetName}`,
                        context: `clear ${permLabel} for ${t.kind} ${t.targetName}`,
                        meta: ["action"],
                        onClick: () => void clearTargetFromPermission(getLatest(), t.kind, t.targetId, bit),
                    },
                    [icon({ name: REMOVE_ICON_NAME, classes: [], context: null, meta: null })],
                ),
            ],
        );
        chip.setAttr(DATA_PERM_BIT, String(bit));
        chip.setAttr(DATA_CHIP_TARGET, `${t.kind}:${t.targetId}`);
        chip.el.addEventListener("click", (e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest(`.${CHIP_REMOVE_CLASS}`) !== null) return;
            void cycleTargetState(getLatest(), t.kind, t.targetId, bit, t.state);
        });
        return chip;
    }

    function channelChipEl(c: ChannelChip, bit: number, flagName: string): Instance {
        const permLabel = formatPermissionName(flagName);
        const chip = div(
            {
                classes: [CHIP_CLASS, `${CHIP_MODIFIER_PREFIX}${c.state}`],
                title: `#${c.channelName} (${c.state}) — click to cycle: allow → deny → inherit`,
                context: null,
                meta: null,
            },
            [
                span({
                    classes: [CHIP_LABEL_CLASS],
                    text: `#${c.channelName}`,
                    context: null,
                    meta: null,
                }),
                button(
                    {
                        classes: [CHIP_REMOVE_CLASS],
                        variant: BTN_VARIANT_BARE,
                        ariaLabel: `Remove #${c.channelName} from ${permLabel}`,
                        title: `clear all ${permLabel} overrides on #${c.channelName}`,
                        context: `clear ${permLabel} for #${c.channelName}`,
                        meta: ["action"],
                        onClick: () => void clearChannelFromPermission(getLatest(), c.channelId, bit),
                    },
                    [icon({ name: REMOVE_ICON_NAME, classes: [], context: null, meta: null })],
                ),
            ],
        );
        chip.setAttr(DATA_PERM_BIT, String(bit));
        chip.setAttr(DATA_CHIP_CHANNEL, c.channelId);
        chip.el.addEventListener("click", (e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest(`.${CHIP_REMOVE_CLASS}`) !== null) return;
            void cycleChannelState(getLatest(), c.channelId, bit, c.state);
        });
        return chip;
    }

    function roleLevelChipsFor(b: number): RoleLevelChip[] {
        const mask = 1n << BigInt(b);
        const editableRoleIds = new Set<string>();
        for (const o of latest) {
            if (o.kind !== "role") continue;
            if (((safeBigInt(o.allow) | safeBigInt(o.deny)) & mask) === 0n) continue;
            editableRoleIds.add(targetIdOf(o));
        }
        return listRoles(guildId)
            .filter((r) => (safeBigInt(r.permissions) & mask) !== 0n)
            .filter((r) => !editableRoleIds.has(r.role_id))
            .map((r): RoleLevelChip => ({ roleId: r.role_id, roleName: r.name }))
            .sort((a, b2) => a.roleName.localeCompare(b2.roleName));
    }

    function roleLevelChipEl(c: RoleLevelChip, flagName: string): Instance {
        const permLabel = formatPermissionName(flagName);
        return div(
            {
                classes: [CHIP_CLASS, LOCKED_MODIFIER],
                title: `role: ${c.roleName} has ${permLabel} via role base permissions (locked)`,
                context: null,
                meta: null,
            },
            [
                icon({ name: LOCK_ICON_NAME, classes: [], context: null, meta: null }),
                span({
                    classes: [CHIP_LABEL_CLASS],
                    text: `role: ${c.roleName}`,
                    context: null,
                    meta: null,
                }),
            ],
        );
    }

    function permissionRow(bit: number, flagName: string): Instance {
        const permLabel = formatPermissionName(flagName);
        const targets = targetChipsFor(latest, bit);
        const channels = channelChipsFor(guildId, latest, bit);
        const roleLevel = roleLevelChipsFor(bit);

        const slideContent = div({ classes: [], context: null, meta: null });
        const slidePanelEl = div({ classes: [SLIDE_PANEL_CLASS], context: null, meta: null }, [slideContent]);
        let isOpen = false;

        function close(): void {
            isOpen = false;
            slidePanelEl.toggleClass(SLIDE_PANEL_OPEN_CLASS, false);
            slideContent.clear();
        }

        function toggle(): void {
            if (isOpen) {
                close();
                return;
            }
            isOpen = true;
            slidePanelEl.toggleClass(SLIDE_PANEL_OPEN_CLASS, true);
            slideContent.setChildren(buildAddForm(guildId, bit, getLatest, close));
        }

        function addBtnEl(ariaPrefix: string): Instance {
            return button(
                {
                    classes: [ROW_ADD_CLASS],
                    variant: BTN_VARIANT_BARE,
                    ariaLabel: `${ariaPrefix} override for ${permLabel}`,
                    title: `${ariaPrefix} override for ${permLabel}`,
                    context: `${ariaPrefix} override for ${permLabel}`,
                    meta: ["action"],
                    onClick: toggle,
                },
                [icon({ name: ADD_ICON_NAME, classes: [], context: null, meta: null })],
            );
        }

        const guildOnly = isGuildOnly(bit);
        const roleSlot = guildOnly
            ? div({ classes: [ROW_SLOT_CLASS], context: null, meta: null }, [
                  ...roleLevel.map((c) => roleLevelChipEl(c, flagName)),
                  span({
                      classes: [NA_TEXT_CLASS],
                      text: "guild-level — role base perms only",
                      context: null,
                      meta: null,
                  }),
              ])
            : div({ classes: [ROW_SLOT_CLASS], context: null, meta: null }, [
                  ...roleLevel.map((c) => roleLevelChipEl(c, flagName)),
                  ...targets.map((t) => targetChipEl(t, bit, flagName)),
                  addBtnEl("Add role"),
              ]);
        const channelSlot = guildOnly
            ? div({ classes: [ROW_SLOT_CLASS], context: null, meta: null }, [
                  span({
                      classes: [NA_TEXT_CLASS],
                      text: "n/a",
                      context: null,
                      meta: null,
                  }),
              ])
            : div({ classes: [ROW_SLOT_CLASS], context: null, meta: null }, [
                  ...channels.map((c) => channelChipEl(c, bit, flagName)),
                  addBtnEl("Add channel"),
              ]);
        if (!guildOnly) {
            setupDropTarget(roleSlot, "roles", bit);
            setupDropTarget(channelSlot, "channels", bit);
        }
        const rowLine = div({ classes: [ROW_CLASS], context: null, meta: null }, [
            span({ classes: [ROW_NAME_CLASS], text: permLabel, context: null, meta: null }),
            icon({ name: ARROW_ICON_NAME, classes: [ROW_ARROW_CLASS], context: null, meta: null }),
            roleSlot,
            icon({ name: ARROW_ICON_NAME, classes: [ROW_ARROW_CLASS], context: null, meta: null }),
            channelSlot,
        ]);
        return div({ classes: [ROW_BLOCK_CLASS], context: null, meta: null }, [rowLine, slidePanelEl]);
    }

    function rerender(): void {
        clearHover();
        const rows = PERMISSION_FLAG_NAMES.map((flagName, bit) => permissionRow(bit, flagName));
        rowsList.setChildren(...rows);
    }

    const feed = createChannelOverwritesFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            latest = snap.rows as DiscordChannelOverwrite[];
            rerender();
        },
        (batch) => {
            const byKey = new Map<string, DiscordChannelOverwrite>();
            for (const o of latest) byKey.set(`${o.channel_id}:${targetIdOf(o)}`, o);
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) {
                    const row = d.row as DiscordChannelOverwrite;
                    byKey.set(`${row.channel_id}:${targetIdOf(row)}`, row);
                } else if (d.op === "remove") {
                    byKey.delete(d.key);
                }
            }
            latest = [...byKey.values()];
            rerender();
        },
    );

    effect(() => {
        guildDataVersion();
        rerender();
    });

    inspectorOverride$.set(() => buildSwatchPanel(guildId));
    rowsHost.trackDispose({
        dispose: () => {
            unsubscribe();
            inspectorOverride$.set(null);
        },
    });
    return rowsHost;
}
