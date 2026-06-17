import { div, wireChange, type Instance } from "../../../../../../factory";
import { textInput } from "../../../../../../factory/content-ops/form/inputs/text-input.js";
import { FORM_FIELD, FORM_FIELD_LABEL, FORM_INPUT } from "../../../../../../forms/form-classes.js";
import { label as labelEl } from "../../../../../../factory/content-ops/form/input-label.js";
import { buildGlassSelect, type SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import { buildGlassCheck } from "../../../../../../forms/glass/inputs/glass-check.js";
import { buildSlidePanelCreateForm } from "../../../../../../forms/slide-panels/slide-panel-create-form.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import {
    createDiscordChannel,
    createDiscordWebhook,
    type DiscordChannel,
} from "../../../../../../../state/discord/client.js";

const CATEGORY_TYPE = 4;
const TEXT_CHANNEL_TYPE = 0;
const ANNOUNCEMENT_CHANNEL_TYPE = 5;
const TYPE_STAGE = 13;
const TYPE_FORUM = 15;
const TYPE_MEDIA = 16;
const COMMUNITY_GATED_TYPES: ReadonlySet<number> = new Set([
    ANNOUNCEMENT_CHANNEL_TYPE,
    TYPE_STAGE,
    TYPE_FORUM,
    TYPE_MEDIA,
]);
const WEBHOOK_CAPABLE_TYPES: ReadonlySet<number> = new Set([TEXT_CHANNEL_TYPE, ANNOUNCEMENT_CHANNEL_TYPE]);
const FEATURE_COMMUNITY = "COMMUNITY";

const KIND_CHANNEL = "channel";
const KIND_WEBHOOK = "webhook";
const KIND_FIELD_NAME = "create_kind";
const KIND_OPTIONS: ReadonlyArray<SelectOption> = [
    { value: KIND_CHANNEL, label: "Channel" },
    { value: KIND_WEBHOOK, label: "Webhook" },
];

const DEFAULT_TYPE = "0";
const DEFAULT_CHANNEL_NAME = "new-channel";
const DEFAULT_WEBHOOK_NAME = "new webhook";
const TRIGGER_LABEL = "+ Create";
const SUBMIT_LABEL = "Create";
const NO_PARENT_LABEL = "(no category)";
const NO_PARENT_VALUE = "";
const HIDDEN_INPUT_SELECTOR = "input[type='hidden']";
const TYPE_FIELD_NAME = "channel_type";
const PARENT_FIELD_NAME = "channel_parent";
const CHANNEL_NAME_FIELD_NAME = "channel_name";
const WEBHOOK_CHANNEL_FIELD_NAME = "webhook_channel";
const JOINT_CHECK_FIELD_NAME = "joint_webhook";
const JOINT_CHECK_LABEL = "Also create a webhook on this channel";
const JOINT_WEBHOOK_NAME_LABEL = "Webhook name";
const UNNAMED_FALLBACK = "(unnamed)";
const NO_WEBHOOK_CAPABLE_TEXT =
    "No webhook-capable channels yet. Switch to Channel and create a Text or Announcement channel first.";

const JOINT_WAIT_TIMEOUT_MS = 5000;
const JOINT_POLL_INTERVAL_MS = 200;

const CHANNEL_TYPE_OPTIONS: ReadonlyArray<SelectOption> = [
    { value: "0", label: "Text" },
    { value: "2", label: "Voice" },
    { value: "4", label: "Category" },
    { value: "5", label: "Announcement" },
    { value: "13", label: "Stage" },
    { value: "15", label: "Forum" },
    { value: "16", label: "Media" },
];

export interface BuildCreateToolbarOptions {
    guildId: string;
    getChannels: () => readonly DiscordChannel[];
    features: readonly string[];
}

function isWebhookCapable(channelType: number): boolean {
    return WEBHOOK_CAPABLE_TYPES.has(channelType);
}

function typeOptionsFor(features: readonly string[]): SelectOption[] {
    const isCommunity = features.includes(FEATURE_COMMUNITY);
    if (isCommunity) return [...CHANNEL_TYPE_OPTIONS];
    return CHANNEL_TYPE_OPTIONS.filter((o) => !COMMUNITY_GATED_TYPES.has(Number(o.value)));
}

function buildField(labelText: string, inputId: string, control: Instance): Instance {
    return div({ classes: [FORM_FIELD], id: inputId, context: null, meta: null }, [
        labelEl({ classes: [FORM_FIELD_LABEL], text: labelText, htmlFor: inputId, context: null, meta: null }),
        control,
    ]);
}

function parentOptionsFrom(categories: readonly DiscordChannel[]): SelectOption[] {
    const out: SelectOption[] = [{ value: NO_PARENT_VALUE, label: NO_PARENT_LABEL }];
    for (const cat of categories) {
        out.push({ value: cat.channel_id, label: cat.name ?? UNNAMED_FALLBACK });
    }
    return out;
}

function webhookChannelOptionsFrom(channels: readonly DiscordChannel[]): SelectOption[] {
    const capable = channels.filter((c) => isWebhookCapable(c.type));
    return capable.map((c) => ({
        value: c.channel_id,
        label: c.name ?? UNNAMED_FALLBACK,
    }));
}

function readSelectValue(selectInst: Instance): string {
    const hidden = selectInst.el.querySelector<HTMLInputElement>(HIDDEN_INPUT_SELECTOR);
    return hidden?.value ?? "";
}

async function submitChannelCreate(
    guildId: string,
    channelType: number,
    parentId: string | null,
    name: string,
): Promise<boolean> {
    const session = identityStore.session$();
    if (session === null) return false;
    const result = await createDiscordChannel(guildId, {
        userId: session.id,
        name: name.length > 0 ? name : DEFAULT_CHANNEL_NAME,
        channelType,
        parentId,
    });
    return !("error" in result);
}

async function submitWebhookCreate(guildId: string, channelId: string, name: string): Promise<boolean> {
    const session = identityStore.session$();
    if (session === null) return false;
    return createDiscordWebhook(guildId, {
        userId: session.id,
        channelId,
        name: name.length > 0 ? name : DEFAULT_WEBHOOK_NAME,
    });
}

function waitForNewWebhookCapableChannel(
    getChannels: () => readonly DiscordChannel[],
    beforeIds: ReadonlySet<string>,
): Promise<DiscordChannel | null> {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        const tick = (): void => {
            const candidate = getChannels().find((c) => !beforeIds.has(c.channel_id) && isWebhookCapable(c.type));
            if (candidate !== undefined) {
                resolve(candidate);
                return;
            }
            if (Date.now() - startedAt > JOINT_WAIT_TIMEOUT_MS) {
                resolve(null);
                return;
            }
            setTimeout(tick, JOINT_POLL_INTERVAL_MS);
        };
        tick();
    });
}

interface FormRefs {
    kindSelect: Instance | null;
    channelTypeSelect: Instance | null;
    channelParentSelect: Instance | null;
    channelParentField: Instance | null;
    channelNameInput: Instance<HTMLInputElement> | null;
    jointCheckField: Instance | null;
    jointWebhookNameInput: Instance<HTMLInputElement> | null;
    jointWebhookNameField: Instance | null;
    getJointChecked: (() => boolean) | null;
    webhookChannelSelect: Instance | null;
    webhookChannelField: Instance | null;
    webhookNameInput: Instance<HTMLInputElement> | null;
    webhookNameField: Instance | null;
    webhookEmptyHint: Instance | null;
    channelSection: Instance | null;
    webhookSection: Instance | null;
}

function buildJointCheckAndWebhookField(refs: FormRefs, applyVisibility: () => void): Instance[] {
    let jointChecked = false;
    refs.getJointChecked = () => jointChecked;
    const jointCheck = buildGlassCheck({
        name: JOINT_CHECK_FIELD_NAME,
        ariaLabel: JOINT_CHECK_LABEL,
        checked: () => jointChecked,
        onChange: (v) => {
            jointChecked = v;
            applyVisibility();
        },
    });
    const jointCheckField = div({ classes: [FORM_FIELD], context: null, meta: null }, [
        labelEl({
            classes: [FORM_FIELD_LABEL],
            text: JOINT_CHECK_LABEL,
            htmlFor: JOINT_CHECK_FIELD_NAME,
            context: null,
            meta: null,
        }),
        jointCheck,
    ]);
    refs.jointCheckField = jointCheckField;
    const jwIn = textInput({
        classes: [FORM_INPUT],
        value: DEFAULT_WEBHOOK_NAME,
        ariaLabel: JOINT_WEBHOOK_NAME_LABEL,
        context: "type the webhook name for the new channel",
        meta: ["input"],
    });
    refs.jointWebhookNameInput = jwIn;
    const jointWebhookNameField = buildField(JOINT_WEBHOOK_NAME_LABEL, "channel-create-joint-webhook-name", jwIn);
    refs.jointWebhookNameField = jointWebhookNameField;
    return [jointCheckField, jointWebhookNameField];
}

function buildChannelSection(opts: BuildCreateToolbarOptions, refs: FormRefs, applyVisibility: () => void): Instance {
    const categories = opts.getChannels().filter((c) => c.type === CATEGORY_TYPE);
    const typeOptions = typeOptionsFor(opts.features);
    const tSel = buildGlassSelect(TYPE_FIELD_NAME, typeOptions, DEFAULT_TYPE);
    const pSel = buildGlassSelect(PARENT_FIELD_NAME, parentOptionsFrom(categories), NO_PARENT_VALUE);
    const cnIn = textInput({
        classes: [FORM_INPUT],
        value: DEFAULT_CHANNEL_NAME,
        ariaLabel: "Channel name",
        name: CHANNEL_NAME_FIELD_NAME,
        context: "type the channel name",
        meta: ["input"],
    });
    refs.channelTypeSelect = tSel;
    refs.channelParentSelect = pSel;
    refs.channelNameInput = cnIn;
    const parentField = buildField("Category", "channel-create-parent", pSel);
    refs.channelParentField = parentField;
    const jointRows = buildJointCheckAndWebhookField(refs, applyVisibility);
    return div({ classes: [], context: null, meta: null }, [
        buildField("Type", "channel-create-type", tSel),
        parentField,
        buildField("Name", "channel-create-name", cnIn),
        ...jointRows,
    ]);
}

function buildWebhookSection(opts: BuildCreateToolbarOptions, refs: FormRefs): Instance {
    const channelOptions = webhookChannelOptionsFrom(opts.getChannels());
    const defaultChannelId = channelOptions[0]?.value ?? "";
    const wcSel = buildGlassSelect(WEBHOOK_CHANNEL_FIELD_NAME, channelOptions, defaultChannelId);
    const whIn = textInput({
        classes: [FORM_INPUT],
        value: DEFAULT_WEBHOOK_NAME,
        ariaLabel: "Webhook name",
        context: "type the webhook name",
        meta: ["input"],
    });
    refs.webhookChannelSelect = wcSel;
    refs.webhookNameInput = whIn;
    const channelField = buildField("Channel", "webhook-create-channel", wcSel);
    const nameField = buildField("Name", "webhook-create-name", whIn);
    refs.webhookChannelField = channelField;
    refs.webhookNameField = nameField;
    const emptyHint = div({ classes: [], context: null, meta: null }, [
        labelEl({
            classes: [FORM_FIELD_LABEL],
            text: NO_WEBHOOK_CAPABLE_TEXT,
            htmlFor: WEBHOOK_CHANNEL_FIELD_NAME,
            context: null,
            meta: null,
        }),
    ]);
    refs.webhookEmptyHint = emptyHint;
    const hasCapable = channelOptions.length > 0;
    emptyHint.el.hidden = hasCapable;
    channelField.el.hidden = !hasCapable;
    nameField.el.hidden = !hasCapable;
    return div({ classes: [], context: null, meta: null }, [emptyHint, channelField, nameField]);
}

function applyChannelVisibility(refs: FormRefs): void {
    if (refs.channelTypeSelect === null || refs.channelParentField === null) return;
    const channelType = Number(readSelectValue(refs.channelTypeSelect));
    const isCategory = channelType === CATEGORY_TYPE;
    const capable = isWebhookCapable(channelType);
    const jointOn = refs.getJointChecked !== null && refs.getJointChecked();
    refs.channelParentField.el.hidden = isCategory;
    if (refs.jointCheckField !== null) refs.jointCheckField.el.hidden = !capable;
    if (refs.jointWebhookNameField !== null) refs.jointWebhookNameField.el.hidden = !(capable && jointOn);
}

function applyKindVisibility(refs: FormRefs): void {
    if (refs.kindSelect === null) return;
    const kind = readSelectValue(refs.kindSelect);
    const isChannel = kind === KIND_CHANNEL;
    if (refs.channelSection !== null) refs.channelSection.el.hidden = !isChannel;
    if (refs.webhookSection !== null) refs.webhookSection.el.hidden = isChannel;
    if (isChannel) applyChannelVisibility(refs);
}

async function handleChannelOnlySubmit(
    opts: BuildCreateToolbarOptions,
    typeValue: number,
    parentId: string | null,
    name: string,
): Promise<string | undefined> {
    const ok = await submitChannelCreate(opts.guildId, typeValue, parentId, name);
    return ok ? undefined : "Failed to create channel.";
}

async function handleJointChannelWebhookSubmit(
    opts: BuildCreateToolbarOptions,
    typeValue: number,
    parentId: string | null,
    channelName: string,
    webhookName: string,
): Promise<string | undefined> {
    const beforeIds = new Set(opts.getChannels().map((c) => c.channel_id));
    const channelOk = await submitChannelCreate(opts.guildId, typeValue, parentId, channelName);
    if (!channelOk) return "Failed to create channel.";
    const newChannel = await waitForNewWebhookCapableChannel(opts.getChannels, beforeIds);
    if (newChannel === null) return "Channel created — webhook timed out waiting for the new channel.";
    const webhookOk = await submitWebhookCreate(opts.guildId, newChannel.channel_id, webhookName);
    if (!webhookOk) return "Channel created — webhook creation failed.";
    return undefined;
}

async function handleChannelKindSubmit(opts: BuildCreateToolbarOptions, refs: FormRefs): Promise<string | undefined> {
    if (refs.channelTypeSelect === null || refs.channelParentSelect === null || refs.channelNameInput === null) {
        return "Form not ready.";
    }
    const typeValue = Number(readSelectValue(refs.channelTypeSelect));
    const parentValue = readSelectValue(refs.channelParentSelect);
    const parentId = parentValue === NO_PARENT_VALUE || typeValue === CATEGORY_TYPE ? null : parentValue;
    const channelName = refs.channelNameInput.el.value;
    const wantJoint = refs.getJointChecked !== null && refs.getJointChecked() && isWebhookCapable(typeValue);
    if (!wantJoint) return handleChannelOnlySubmit(opts, typeValue, parentId, channelName);
    if (refs.jointWebhookNameInput === null) return "Form not ready.";
    const webhookName = refs.jointWebhookNameInput.el.value;
    return handleJointChannelWebhookSubmit(opts, typeValue, parentId, channelName, webhookName);
}

async function handleWebhookKindSubmit(opts: BuildCreateToolbarOptions, refs: FormRefs): Promise<string | undefined> {
    if (refs.webhookChannelSelect === null || refs.webhookNameInput === null) return "Form not ready.";
    const channelId = readSelectValue(refs.webhookChannelSelect);
    if (channelId === "") return "No webhook-capable channels available.";
    const ok = await submitWebhookCreate(opts.guildId, channelId, refs.webhookNameInput.el.value);
    return ok ? undefined : "Failed to create webhook.";
}

async function handleSubmit(opts: BuildCreateToolbarOptions, refs: FormRefs): Promise<string | undefined> {
    if (refs.kindSelect === null) return "Form not ready.";
    const kind = readSelectValue(refs.kindSelect);
    if (kind === KIND_CHANNEL) return handleChannelKindSubmit(opts, refs);
    if (kind === KIND_WEBHOOK) return handleWebhookKindSubmit(opts, refs);
    return "Unknown create type.";
}

export function buildCreateToolbar(opts: BuildCreateToolbarOptions): Instance {
    const refs: FormRefs = {
        kindSelect: null,
        channelTypeSelect: null,
        channelParentSelect: null,
        channelParentField: null,
        channelNameInput: null,
        jointCheckField: null,
        jointWebhookNameInput: null,
        jointWebhookNameField: null,
        getJointChecked: null,
        webhookChannelSelect: null,
        webhookChannelField: null,
        webhookNameInput: null,
        webhookNameField: null,
        webhookEmptyHint: null,
        channelSection: null,
        webhookSection: null,
    };

    return buildSlidePanelCreateForm({
        triggerLabel: TRIGGER_LABEL,
        triggerContext: "open create slide-panel (channel or webhook)",
        submitLabel: SUBMIT_LABEL,
        submitContext: "create the selected channel or webhook",
        buildFields: () => {
            const kSel = buildGlassSelect(KIND_FIELD_NAME, [...KIND_OPTIONS], KIND_CHANNEL);
            refs.kindSelect = kSel;
            const applyAll = (): void => applyKindVisibility(refs);
            const channelSection = buildChannelSection(opts, refs, applyAll);
            const webhookSection = buildWebhookSection(opts, refs);
            refs.channelSection = channelSection;
            refs.webhookSection = webhookSection;
            applyKindVisibility(refs);
            wireChange(kSel.el, applyAll);
            if (refs.channelTypeSelect !== null) {
                wireChange(refs.channelTypeSelect.el, applyAll);
            }
            return [buildField("Create", "create-kind", kSel), channelSection, webhookSection];
        },
        onSubmit: () => handleSubmit(opts, refs),
    });
}
