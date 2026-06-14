import { div } from "../../../../../factory/layout-ops/index.js";
import { input } from "../../../../../factory/content-ops/index.js";
import { buildGlassSelect, type SelectOption } from "../../../../../forms/glass/inputs/glass-select.js";
import { KNOWN_PROVIDERS, modelsForProvider, providerLabel } from "../../../known-providers.js";
import { CUSTOM_MODEL, CUSTOM_PROVIDER, FORM_ROW_CLASS, FORM_ROW_FILL_CLASS, INPUT_CLASS } from "../constants.js";

export interface ProviderConfigSlice {
    apiKey: string;
    maxTokens?: number;
    model?: string;
}

export interface ProviderModelFields {
    providerWrap: ReturnType<typeof div>;
    modelHost: ReturnType<typeof div>;
    providerHidden: HTMLInputElement;
    customInput: ReturnType<typeof input>;
    getModelValue: () => string;
    rebuild: () => void;
    usedProviders: Set<string>;
}

export interface BuildProviderModelArgs {
    isEdit: boolean;
    editingProvider: string | null;
    allProviders: string[];
    existingConfig: ProviderConfigSlice | null;
}

export function buildProviderModelFields(args: BuildProviderModelArgs): ProviderModelFields {
    const { isEdit, editingProvider, allProviders, existingConfig } = args;
    const usedProviders = new Set(allProviders);

    const providerOptions: SelectOption[] = [];
    for (const known of KNOWN_PROVIDERS) {
        const isSelf = isEdit && known === editingProvider;
        if (!isSelf && usedProviders.has(known)) continue;
        providerOptions.push({ value: known, label: providerLabel(known) });
    }
    providerOptions.push({ value: CUSTOM_PROVIDER, label: "Custom" });
    const usingCustom = isEdit && editingProvider !== null && !KNOWN_PROVIDERS.includes(editingProvider);
    const initialProviderValue = usingCustom
        ? CUSTOM_PROVIDER
        : isEdit && editingProvider
          ? editingProvider
          : (providerOptions[0]?.value ?? CUSTOM_PROVIDER);
    const providerSelect = buildGlassSelect("provider", providerOptions, initialProviderValue);
    const providerHidden = providerSelect.el.querySelector<HTMLInputElement>('input[type="hidden"]')!;

    const customInput = input({
        classes: [INPUT_CLASS],
        ariaLabel: "Custom provider name",
        type: "text",
        autocomplete: "off",
        placeholder: "Custom provider name",
        context: "enter a custom AI provider name",
        meta: ["input"],
        onInput: () => {
            if (providerHidden.value === CUSTOM_PROVIDER) rebuild();
        },
    });
    if (usingCustom && editingProvider) customInput.el.value = editingProvider;
    customInput.el.hidden = !usingCustom;

    const modelHost = div({ classes: [FORM_ROW_CLASS], context: null, meta: null });
    let modelValueGetter: () => string = () => "";

    function rebuild(): void {
        modelHost.clear();
        const providerValue = providerHidden.value;
        const effectiveProvider =
            providerValue === CUSTOM_PROVIDER ? customInput.el.value.trim().toLowerCase() : providerValue;
        const availableModels = effectiveProvider ? modelsForProvider(effectiveProvider) : [];
        const currentModel = existingConfig?.model;
        const customModelInput = input({
            classes: [INPUT_CLASS],
            ariaLabel: "Custom model name",
            type: "text",
            autocomplete: "off",
            placeholder: "Model name",
            context: "enter a custom model name",
            meta: ["input"],
        });
        if (availableModels.length === 0) {
            if (currentModel) customModelInput.el.value = currentModel;
            customModelInput.mount(modelHost.el);
            modelValueGetter = () => customModelInput.el.value.trim();
            return;
        }
        const modelOptions: SelectOption[] = availableModels.map((m) => ({ value: m, label: m }));
        modelOptions.push({ value: CUSTOM_MODEL, label: "Custom…" });
        const currentIsKnown = currentModel ? availableModels.includes(currentModel) : false;
        const initial = currentIsKnown ? currentModel! : currentModel ? CUSTOM_MODEL : availableModels[0]!;
        const modelSelect = buildGlassSelect("model", modelOptions, initial);
        modelSelect.mount(modelHost.el);
        customModelInput.mount(modelHost.el);
        const modelHidden = modelSelect.el.querySelector<HTMLInputElement>('input[type="hidden"]')!;
        if (initial === CUSTOM_MODEL) {
            customModelInput.el.value = currentModel ?? "";
            customModelInput.el.hidden = false;
        } else {
            customModelInput.el.hidden = true;
        }
        modelHidden.addEventListener("change", () => {
            customModelInput.el.hidden = modelHidden.value !== CUSTOM_MODEL;
        });
        modelValueGetter = () =>
            modelHidden.value === CUSTOM_MODEL ? customModelInput.el.value.trim() : modelHidden.value;
    }

    providerHidden.addEventListener("change", () => {
        customInput.el.hidden = providerHidden.value !== CUSTOM_PROVIDER;
        rebuild();
    });
    const providerWrap = div({ classes: [FORM_ROW_CLASS, FORM_ROW_FILL_CLASS], context: null, meta: null }, [
        providerSelect,
        customInput,
    ]);

    return {
        providerWrap,
        modelHost,
        providerHidden,
        customInput,
        getModelValue: () => modelValueGetter(),
        rebuild,
        usedProviders,
    };
}
