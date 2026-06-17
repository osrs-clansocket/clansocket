import { div, effect, paragraph, type Instance } from "../../../../factory";
import { glassInput } from "../../../../forms/glass/inputs/glass-input.js";
import { glassTextarea } from "../../../../forms/glass/inputs/glass-textarea.js";
import { buildGlassCheck } from "../../../../forms/glass/inputs/glass-check.js";
import { updateField, type PanelState } from "./seo-state.js";

export const SEO_FIELD_CLASS = "clans-manage__seo-field";
export const SEO_LABEL_CLASS = "clans-manage__seo-label";
export const SEO_TOGGLE_CLASS = "clans-manage__seo-toggle";
export const SEO_TOGGLE_LABEL_CLASS = "clans-manage__seo-toggle-label";

const TOGGLE_LABEL = "Public";
const CHECK_NAME = "clan-seo-public";

const MAX_DESCRIPTION_LEN = "300";
const TEXTAREA_ROWS = "3";

type TextKey = "title" | "image";

const MAX_TEXT_LEN: Record<TextKey, string> = {
    title: "80",
    image: "500",
};

function syncInputValue(el: HTMLInputElement, next: string): void {
    if (el.value !== next) el.value = next;
}

function syncTextareaValue(el: HTMLTextAreaElement, next: string): void {
    if (el.value !== next) el.value = next;
}

export function buildTextInput(state: PanelState, key: TextKey, placeholder: string, ariaLabel: string): Instance {
    const inp = glassInput({
        placeholder,
        ariaLabel,
        autocomplete: "off",
        maxlength: MAX_TEXT_LEN[key],
        context: `edit clan ${ariaLabel.toLowerCase()}`,
        meta: ["input"],
        onInput: (e) => updateField(state, key, (e.target as HTMLInputElement).value),
    });
    inp.trackDispose(effect(() => syncInputValue(inp.el, state.form()[key] as string)));
    return inp;
}

export function buildDescriptionInput(state: PanelState): Instance {
    const ta = glassTextarea({
        placeholder: "One-sentence description for search snippets and social previews.",
        ariaLabel: "Description",
        rows: TEXTAREA_ROWS,
        maxlength: MAX_DESCRIPTION_LEN,
        context: "edit clan SEO description",
        meta: ["input"],
        onInput: (e) => updateField(state, "description", (e.target as HTMLTextAreaElement).value),
    });
    ta.trackDispose(effect(() => syncTextareaValue(ta.el, state.form().description)));
    return ta;
}

export function buildToggleRow(state: PanelState): Instance {
    const check = buildGlassCheck({
        name: CHECK_NAME,
        checked: () => state.form().isPublic,
        ariaLabel: TOGGLE_LABEL,
        onChange: (next) => updateField(state, "isPublic", next),
    });
    return div({ classes: [SEO_TOGGLE_CLASS], context: null, meta: null }, [
        check,
        paragraph({ classes: [SEO_TOGGLE_LABEL_CLASS], text: TOGGLE_LABEL, context: null, meta: null }),
    ]);
}

export function buildField(labelText: string, control: Instance): Instance {
    return div({ classes: [SEO_FIELD_CLASS], context: null, meta: null }, [
        paragraph({ classes: [SEO_LABEL_CLASS], text: labelText, context: null, meta: null }),
        control,
    ]);
}

export type { TextKey };
