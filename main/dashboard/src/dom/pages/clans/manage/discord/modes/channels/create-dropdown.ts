import {
    button,
    div,
    slidePanel,
    wireChange,
    wireSubmit,
    BTN_VARIANT_BARE,
    BTN_VARIANT_OUTLINE,
    BTN_VARIANT_PRIMARY,
    type Instance,
    type SlidePanelInstance,
} from "../../../../../../factory";
import { form as formEl } from "../../../../../../factory/content-ops/form/form-textarea.js";
import { FORM_CLAIM_FORM, FORM_FIELD, FORM_FIELD_LABEL } from "../../../../../../forms/form-classes.js";
import { label as labelEl } from "../../../../../../factory/content-ops/form/input-label.js";
import { buildGlassSelect, type SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import { createDiscordChannel, type DiscordChannel } from "../../../../../../../state/discord/client.js";

const TOOLBAR_BTN_CLASS = "clans-manage__discord-toolbar-btn";
const ACTIONS_CLASS = "clans-manage__discord-create-actions";

const CATEGORY_TYPE = 4;
const TYPE_ANNOUNCEMENT = 5;
const TYPE_STAGE = 13;
const TYPE_FORUM = 15;
const TYPE_MEDIA = 16;
const COMMUNITY_GATED_TYPES: ReadonlySet<number> = new Set([TYPE_ANNOUNCEMENT, TYPE_STAGE, TYPE_FORUM, TYPE_MEDIA]);
const FEATURE_COMMUNITY = "COMMUNITY";

const DEFAULT_TYPE = "0";
const NEW_CHANNEL_NAME = "new-channel";
const CREATE_LABEL = "Create";
const SUBMIT_LABEL = "Create";
const CANCEL_LABEL = "Cancel";
const NO_PARENT_LABEL = "(no category)";
const NO_PARENT_VALUE = "";
const HIDDEN_INPUT_SELECTOR = "input[type='hidden']";
const TYPE_FIELD_NAME = "channel_type";
const PARENT_FIELD_NAME = "channel_parent";
const UNNAMED_FALLBACK = "(unnamed)";

const CHANNEL_TYPE_OPTIONS: ReadonlyArray<SelectOption> = [
    { value: "0", label: "Text" },
    { value: "2", label: "Voice" },
    { value: "4", label: "Category" },
    { value: "5", label: "Announcement" },
    { value: "13", label: "Stage" },
    { value: "15", label: "Forum" },
    { value: "16", label: "Media" },
];

export interface BuildChannelCreateToolbarOptions {
    guildId: string;
    getChannels: () => readonly DiscordChannel[];
    features: readonly string[];
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

function readSelectValue(selectInst: Instance): string {
    const hidden = selectInst.el.querySelector<HTMLInputElement>(HIDDEN_INPUT_SELECTOR);
    return hidden?.value ?? "";
}

async function submitCreate(guildId: string, channelType: number, parentId: string | null): Promise<boolean> {
    const session = identityStore.session$();
    if (session === null) return false;
    const result = await createDiscordChannel(guildId, {
        userId: session.id,
        name: NEW_CHANNEL_NAME,
        channelType,
        parentId,
    });
    return !("error" in result);
}

export function buildChannelCreateToolbar(opts: BuildChannelCreateToolbarOptions): Instance {
    const panelHost = div({ classes: [], context: null, meta: null });
    let panelInst: SlidePanelInstance | null = null;

    function renderForm(): void {
        const categories = opts.getChannels().filter((c) => c.type === CATEGORY_TYPE);
        const typeOptions = typeOptionsFor(opts.features);
        const typeSelect = buildGlassSelect(TYPE_FIELD_NAME, typeOptions, DEFAULT_TYPE);
        const parentSelect = buildGlassSelect(PARENT_FIELD_NAME, parentOptionsFrom(categories), NO_PARENT_VALUE);
        const parentField = buildField("Category", "channel-create-parent", parentSelect);
        const syncParentVisibility = (): void => {
            const isCategory = readSelectValue(typeSelect) === String(CATEGORY_TYPE);
            parentField.el.hidden = isCategory;
        };
        syncParentVisibility();
        wireChange(typeSelect.el, syncParentVisibility);
        const cancelBtn = button({
            classes: [],
            variant: BTN_VARIANT_OUTLINE,
            compact: true,
            text: CANCEL_LABEL,
            context: "cancel channel creation",
            meta: ["action"],
            onClick: () => panelInst?.close(),
        });
        const submitBtn = button({
            classes: [],
            variant: BTN_VARIANT_PRIMARY,
            compact: true,
            type: "submit",
            text: SUBMIT_LABEL,
            context: "create the channel",
            meta: ["submit"],
        });
        const actions = div({ classes: [ACTIONS_CLASS], context: null, meta: null }, [cancelBtn, submitBtn]);
        const formNode = formEl({ classes: [FORM_CLAIM_FORM], context: null, meta: null }, [
            buildField("Type", "channel-create-type", typeSelect),
            parentField,
            actions,
        ]);
        wireSubmit(formNode.el as HTMLFormElement, (e) => {
            e.preventDefault();
            submitBtn.el.disabled = true;
            const typeValue = Number(readSelectValue(typeSelect));
            const parentValue = readSelectValue(parentSelect);
            const parentId = parentValue === NO_PARENT_VALUE || typeValue === CATEGORY_TYPE ? null : parentValue;
            void submitCreate(opts.guildId, typeValue, parentId).then((ok) => {
                submitBtn.el.disabled = false;
                if (ok) panelInst?.close();
            });
        });
        panelHost.setChildren(formNode);
    }

    const createBtn = button({
        classes: [TOOLBAR_BTN_CLASS],
        variant: BTN_VARIANT_BARE,
        text: CREATE_LABEL,
        context: "open create-channel slide-panel",
        meta: ["action"],
    });

    panelInst = slidePanel(
        {
            onOpen: renderForm,
            onClose: () => panelHost.clear(),
            context: null,
            meta: null,
        },
        createBtn,
        panelHost,
    );

    return panelInst;
}
