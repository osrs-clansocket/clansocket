import { div } from "../../../../../factory/layout-ops/index.js";
import { BTN_VARIANT_OUTLINE, button, form, input, paragraph } from "../../../../../factory/content-ops/index.js";
import { listProviders } from "../../../../../../ai/vault/vault/index.js";
import { getProviderConfig } from "../../../../../../ai/vault/session.js";
import { buildField, describeError } from "../helpers.js";
import {
    EDITOR_FORM_ID,
    ERROR_CLASS,
    FORM_CLASS,
    FORM_ROW_CLASS,
    FORM_ROW_FILL_CLASS,
    INPUT_CLASS,
    PASSWORD_TYPE,
    TOKEN_DEFAULT,
    type KeySettingsOpts,
    type UnlockedSub,
} from "../constants.js";
import { buildPriorityField, buildTokensField } from "./numeric-fields.js";
import { buildProviderModelFields } from "./provider-model-fields.js";
import { handleSave } from "./save.js";

export interface RenderEditorViewArgs {
    bodyHost: HTMLElement;
    footerHost: HTMLElement;
    sub: UnlockedSub;
    setSub: (next: UnlockedSub) => void;
    rerender: () => Promise<void>;
    opts: KeySettingsOpts;
}

export async function renderEditorView({
    bodyHost,
    footerHost,
    sub,
    setSub,
    rerender,
    opts,
}: RenderEditorViewArgs): Promise<void> {
    const allProviders = await listProviders();
    const isEdit = sub.mode === "edit";
    const editingProvider = sub.mode === "edit" ? sub.provider : null;
    const existingConfig = editingProvider ? await getProviderConfig(editingProvider) : null;
    const initialIndex = editingProvider ? allProviders.indexOf(editingProvider) : allProviders.length;
    const totalAfter = isEdit ? allProviders.length : allProviders.length + 1;

    const providerModel = buildProviderModelFields({ isEdit, editingProvider, allProviders, existingConfig });

    const keyInput = input({
        classes: [INPUT_CLASS],
        ariaLabel: "API key",
        type: PASSWORD_TYPE,
        autocomplete: "off",
        placeholder: "sk-...",
        context: "enter the API key for this provider",
        meta: ["input"],
    });
    if (existingConfig) keyInput.el.value = existingConfig.apiKey;

    const tokens = buildTokensField(existingConfig?.maxTokens ?? TOKEN_DEFAULT);
    const priority = buildPriorityField(initialIndex, totalAfter);

    const errorEl = paragraph({ classes: [ERROR_CLASS], context: null, meta: null });
    errorEl.el.hidden = true;
    function showError(msg: string): void {
        errorEl.setText(msg);
        errorEl.el.hidden = false;
    }

    const onSave = (): Promise<void> =>
        handleSave({
            isEdit,
            editingProvider,
            usedProviders: providerModel.usedProviders,
            providerHidden: providerModel.providerHidden,
            customInput: providerModel.customInput,
            keyInput,
            tokensSlider: tokens.slider,
            priorityHidden: priority.hidden,
            getModelValue: providerModel.getModelValue,
            showError,
            setSub,
            rerender,
            opts,
        });

    const editorForm = form(
        {
            id: EDITOR_FORM_ID,
            classes: [FORM_CLASS],
            context: "key editor form — submit to save the provider key",
            meta: ["submit"],
            onSubmit: (e: SubmitEvent) => {
                e.preventDefault();
                errorEl.el.hidden = true;
                onSave().catch((err) => showError(describeError(err)));
            },
        },
        [
            buildField("Provider", providerModel.providerWrap),
            buildField("API key", keyInput),
            buildField("Model", providerModel.modelHost),
            buildField("Max tokens", tokens.wrap),
            buildField("Priority", priority.wrap),
            errorEl,
        ],
    );
    editorForm.mount(bodyHost);
    providerModel.rebuild();

    const saveBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Save key",
        type: "submit",
        form: EDITOR_FORM_ID,
        context: "save the provider key",
        meta: ["submit"],
    });
    const cancelBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Cancel",
        type: "button",
        context: "cancel editing the key",
        meta: ["action"],
        onClick: () => {
            setSub({ mode: "list" });
            rerender().catch(() => undefined);
        },
    });
    div({ classes: [FORM_ROW_CLASS, FORM_ROW_FILL_CLASS], context: null, meta: null }, [saveBtn, cancelBtn]).mount(
        footerHost,
    );
}
