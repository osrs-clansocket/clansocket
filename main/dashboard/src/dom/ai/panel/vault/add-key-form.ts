import { BTN_VARIANT_PRIMARY, button, div, form, input, label, paragraph, span } from "../../../factory";
import { putEntry } from "../../../../ai/vault/vault";
import { getActiveKey } from "../../../../ai/vault/session";
import { events, AppEvents } from "../../../../managers/events";
import {
    FORM_CLAIM_FORM as FORM_CLASS,
    FORM_ERROR as ERROR_CLASS,
    FORM_FIELD as FIELD_CLASS,
    FORM_FIELD_LABEL as FIELD_LABEL_CLASS,
    FORM_FORM_ROW as FORM_ROW_CLASS,
    FORM_HINT as HINT_CLASS,
    FORM_INPUT as INPUT_CLASS,
} from "../../../forms/form-classes.js";

export const MAX_OUTPUT_TOKENS_FLOOR = 1;
export const MAX_OUTPUT_TOKENS_CEILING = 32000;
export const MAX_OUTPUT_TOKENS_DEFAULT = 4096;

export interface AddKeyHandle {
    el: HTMLElement;
    destroy: () => void;
}

export interface AddKeyOpts {
    onSaved?: () => void;
    onCancel?: () => void;
}

function describeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

function renderAddKeyForm(container: HTMLElement, opts: AddKeyOpts = {}): AddKeyHandle {
    const helpEl = paragraph({
        classes: [HINT_CLASS],
        text: "Pick a provider (openai, anthropic, etc) and paste your API key. Stored encrypted in your vault.",
        context: null,
        meta: null,
    });
    const errorEl = paragraph({ classes: [ERROR_CLASS], context: null, meta: null });
    errorEl.el.hidden = true;
    function showError(message: string): void {
        errorEl.setText(message);
        errorEl.el.hidden = false;
    }
    const providerInput = input({
        classes: [INPUT_CLASS],
        ariaLabel: "Provider",
        type: "text",
        placeholder: "openai",
        autocomplete: "off",
        context: "enter the AI provider name (openai, anthropic, etc)",
        meta: ["input"],
    });
    const keyInput = input({
        classes: [INPUT_CLASS],
        ariaLabel: "API key",
        type: "password",
        placeholder: "sk-...",
        autocomplete: "new-password",
        context: "enter the API key for the provider",
        meta: ["input"],
    });
    const maxTokensInput = input({
        classes: [INPUT_CLASS],
        ariaLabel: "Max output tokens per request",
        type: "number",
        placeholder: String(MAX_OUTPUT_TOKENS_DEFAULT),
        autocomplete: "off",
        min: String(MAX_OUTPUT_TOKENS_FLOOR),
        max: String(MAX_OUTPUT_TOKENS_CEILING),
        step: "1",
        context: "set the max output tokens per request",
        meta: ["input"],
    });
    const providerField = label({ classes: [FIELD_CLASS], context: null, meta: null }, [
        span({ classes: [FIELD_LABEL_CLASS], text: "Provider", context: null, meta: null }),
        providerInput,
    ]);
    const keyField = label({ classes: [FIELD_CLASS], context: null, meta: null }, [
        span({ classes: [FIELD_LABEL_CLASS], text: "API key", context: null, meta: null }),
        keyInput,
    ]);
    const maxTokensField = label({ classes: [FIELD_CLASS], context: null, meta: null }, [
        span({
            classes: [FIELD_LABEL_CLASS],
            text: `Max output tokens (${MAX_OUTPUT_TOKENS_FLOOR}–${MAX_OUTPUT_TOKENS_CEILING})`,
            context: null,
            meta: null,
        }),
        maxTokensInput,
    ]);
    async function handleSubmit(): Promise<void> {
        errorEl.el.hidden = true;
        const provider = providerInput.el.value.trim().toLowerCase();
        const apiKey = keyInput.el.value.trim();
        const maxRaw = maxTokensInput.el.value.trim();
        if (!provider || !apiKey) return showError("Provider and key are required");
        let maxTokens: number | undefined;
        if (maxRaw.length > 0) {
            const parsed = Number.parseInt(maxRaw, 10);
            if (!Number.isFinite(parsed) || parsed < MAX_OUTPUT_TOKENS_FLOOR || parsed > MAX_OUTPUT_TOKENS_CEILING)
                return showError("Max tokens must be 1–32000");
            maxTokens = parsed;
        }
        const derived = getActiveKey();
        if (!derived) return showError("Vault is locked");
        try {
            await putEntry(derived, provider, { apiKey, maxTokens });
            events.emit(AppEvents.AI_VAULT_CHANGED);
            opts.onSaved?.();
        } catch (err) {
            showError(describeError(err));
        }
    }
    const submitBtn = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        type: "submit",
        text: "Save key",
        context: "save the API key to your vault",
        meta: ["submit"],
    });
    const cancelBtn = button({
        compact: true,
        type: "button",
        text: "Cancel",
        context: "cancel adding a key",
        meta: ["action"],
        onClick: () => opts.onCancel?.(),
    });
    const sec = form(
        {
            classes: [FORM_CLASS],
            context: "add an API key — submit to save the provider key to your vault",
            meta: ["submit"],
            onSubmit: (e: SubmitEvent) => {
                e.preventDefault();
                handleSubmit().catch((err) => showError(describeError(err)));
            },
        },
        [
            helpEl,
            providerField,
            keyField,
            maxTokensField,
            errorEl,
            div({ classes: [FORM_ROW_CLASS], context: null, meta: null }, [submitBtn, cancelBtn]),
        ],
    );
    sec.mount(container);
    return { el: sec.el, destroy: () => sec.destroy() };
}

export { renderAddKeyForm };
