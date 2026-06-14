import { div } from "../../../../../factory/layout-ops/index.js";
import { input, span } from "../../../../../factory/content-ops/index.js";
import { buildGlassSelect, type SelectOption } from "../../../../../forms/glass/inputs/glass-select.js";
import { applyNearSnap, priorityWord } from "../helpers.js";
import { FORM_ROW_CLASS, FORM_ROW_FILL_CLASS, HINT_CLASS, TOKEN_DEFAULT, TOKEN_MAX, TOKEN_MIN } from "../constants.js";
import { ACCOUNT_TOKEN_SLIDER_CLASS } from "../../../../../../shared/constants/account-constants.js";

export function buildTokensField(initialTokens: number): {
    wrap: ReturnType<typeof div>;
    slider: ReturnType<typeof input>;
} {
    const value = initialTokens || TOKEN_DEFAULT;
    const label = span({ classes: [HINT_CLASS], text: `${value} max tokens`, context: null, meta: null });
    const slider = input({
        classes: [ACCOUNT_TOKEN_SLIDER_CLASS],
        ariaLabel: "Max output tokens",
        type: "range",
        min: String(TOKEN_MIN),
        max: String(TOKEN_MAX),
        step: "1",
        value: String(value),
        context: "set the max output tokens per request",
        meta: ["input"],
        onInput: () => {
            const raw = Number(slider.el.value);
            const snapped = applyNearSnap(raw);
            if (snapped !== raw) slider.el.value = String(snapped);
            label.setText(`${snapped} max tokens`);
        },
    });
    return {
        wrap: div({ classes: [FORM_ROW_CLASS, FORM_ROW_FILL_CLASS], context: null, meta: null }, [slider, label]),
        slider,
    };
}

export function buildPriorityField(
    initialIndex: number,
    totalAfter: number,
): {
    wrap: ReturnType<typeof buildGlassSelect>;
    hidden: HTMLInputElement;
} {
    const initialValue = String(Math.min(initialIndex, totalAfter - 1));
    const options: SelectOption[] = [];
    for (let i = 0; i < totalAfter; i++) {
        options.push({ value: String(i), label: `${i + 1} (${priorityWord(i)})` });
    }
    const wrap = buildGlassSelect("priority", options, initialValue);
    const hidden = wrap.el.querySelector<HTMLInputElement>('input[type="hidden"]')!;
    return { wrap, hidden };
}
