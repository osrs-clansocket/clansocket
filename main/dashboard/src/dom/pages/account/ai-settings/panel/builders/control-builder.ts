import { button, createInstance, derived, div, effect, icon, span, type Instance } from "../../../../../factory";
import { input, textarea } from "../../../../../factory/content-ops/form";
import { buildGlassSelect, type SelectOption } from "../../../../../forms/glass/inputs/glass-select.js";
import {
    CTRL_BLOCK,
    CTRL_ENTRY,
    CTRL_RANGE,
    CTRL_SELECT,
    CTRL_TOGGLE,
    personaStore,
    type SlotMeta,
} from "../../../../../../ai/persona-store/index.js";
import { defaultValueOf } from "../../../../../../ai/persona-store/defaults-client.js";
import { ATTR_HIDDEN, HIDDEN_FALSE, HIDDEN_TRUE } from "../../shared.js";
import { placeholderForBlock, placeholderForEntry } from "../formatters/placeholder-formatter.js";

const FIELD_RESET_CLASS = "account-ai-settings__field-reset";

const INPUT_BASE_CLASS = "form__input";
const INPUT_ENTRY_CLASS = "account-ai-settings__input--entry";
const INPUT_BLOCK_CLASS = "account-ai-settings__input--block";
const INPUT_NUMBER_CLASS = "account-ai-settings__input--number";

const GLASS_SELECT_LABEL_CLASS = "glass-select__label";
const GLASS_SELECT_OPTION_CLASS = "glass-select__option";
const DATA_ATTR_VALUE = "data-value";
const ATTR_ARIA_SELECTED = "aria-selected";

const TOGGLE_CLASS = "account-ai-settings__toggle";
const TOGGLE_OPT_CLASS = "account-ai-settings__toggle-opt";
const TOGGLE_OPT_ACTIVE_CLASS = "account-ai-settings__toggle-opt--active";

const RANGE_CLASS = "account-ai-settings__range";
const RANGE_SLIDER_CLASS = "account-ai-settings__range-slider";
const RANGE_VALUE_CLASS = "account-ai-settings__range-value";

const BLOCK_ROWS = "5";
const DEFAULT_RANGE_MAX = 100;

export function buildResetButton(meta: SlotMeta): Instance<HTMLButtonElement> {
    const btn = button(
        {
            classes: [FIELD_RESET_CLASS],
            ariaLabel: `Reset ${meta.displayName} to default`,
            title: "Reset to default",
            context: `reset ${meta.displayName}`,
            meta: ["action"],
            onClick: () => personaStore.resetSlot(meta.key),
        },
        [icon({ name: "arrow-counterclockwise", context: null, meta: null }).el],
    );
    btn.trackDispose(
        effect(() => {
            btn.setAttr(ATTR_HIDDEN, personaStore.isOverride(meta.key) ? HIDDEN_FALSE : HIDDEN_TRUE);
        }),
    );
    return btn;
}

function buildEntryControl(meta: SlotMeta): Instance {
    return input({
        ariaLabel: meta.displayName,
        id: `slot-${meta.key}`,
        type: "text",
        classes: [INPUT_BASE_CLASS, INPUT_ENTRY_CLASS],
        placeholder: derived(() => placeholderForEntry(meta)),
        value: derived(() => personaStore.valueOf(meta.key) ?? ""),
        context: meta.description,
        meta: ["input"],
        onInput: (e) => personaStore.commitOrReset(meta.key, meta.type, (e.target as HTMLInputElement).value),
    });
}

function buildBlockControl(meta: SlotMeta): Instance {
    return textarea({
        ariaLabel: meta.displayName,
        id: `slot-${meta.key}`,
        classes: [INPUT_BASE_CLASS, INPUT_BLOCK_CLASS],
        placeholder: derived(() => placeholderForBlock(meta)),
        value: derived(() => personaStore.valueOf(meta.key) ?? ""),
        rows: BLOCK_ROWS,
        spellcheck: "true",
        context: meta.description,
        meta: ["input"],
        onInput: (e) => personaStore.commitOrReset(meta.key, meta.type, (e.target as HTMLTextAreaElement).value),
    });
}

function buildNumberControl(meta: SlotMeta): Instance {
    return input({
        ariaLabel: meta.displayName,
        id: `slot-${meta.key}`,
        type: "number",
        classes: [INPUT_BASE_CLASS, INPUT_NUMBER_CLASS],
        placeholder: derived(() => defaultValueOf(meta.key)),
        value: derived(() => personaStore.valueOf(meta.key) ?? ""),
        min: meta.bounds?.min !== undefined ? String(meta.bounds.min) : undefined,
        max: meta.bounds?.max !== undefined ? String(meta.bounds.max) : undefined,
        inputmode: "numeric",
        context: meta.description,
        meta: ["input"],
        onInput: (e) => personaStore.commitOrReset(meta.key, meta.type, (e.target as HTMLInputElement).value),
    });
}

function buildRangeControl(meta: SlotMeta): Instance {
    const min = meta.bounds?.min ?? 0;
    const max = meta.bounds?.max ?? DEFAULT_RANGE_MAX;
    const slider = input({
        ariaLabel: meta.displayName,
        id: `slot-${meta.key}`,
        type: "range",
        classes: [RANGE_SLIDER_CLASS],
        min: String(min),
        max: String(max),
        value: derived(() => personaStore.valueOf(meta.key) ?? defaultValueOf(meta.key) ?? String(min)),
        context: meta.description,
        meta: ["input"],
        onInput: (e) => personaStore.commitOrReset(meta.key, meta.type, (e.target as HTMLInputElement).value),
    });
    const value = span({
        classes: [RANGE_VALUE_CLASS],
        text: derived(() => personaStore.valueOf(meta.key) ?? defaultValueOf(meta.key) ?? String(min)),
        context: null,
        meta: null,
    });
    return div({ classes: [RANGE_CLASS], context: null, meta: null }, [slider, value]);
}

function buildToggleControl(meta: SlotMeta): Instance {
    const opts = meta.options ?? [];
    const group = div({ classes: [TOGGLE_CLASS], role: "radiogroup", context: null, meta: null });
    for (const opt of opts) {
        const btn = button({
            classes: [TOGGLE_OPT_CLASS],
            text: opt,
            role: "radio",
            data: { value: opt },
            context: `set ${meta.displayName} to ${opt}`,
            meta: ["action"],
            onClick: () => {
                const current = personaStore.valueOf(meta.key) ?? defaultValueOf(meta.key);
                if (current === opt) personaStore.resetSlot(meta.key);
                else personaStore.setSlot(meta.key, opt);
            },
        });
        btn.trackDispose(
            effect(() => {
                const active = (personaStore.valueOf(meta.key) ?? defaultValueOf(meta.key)) === opt;
                btn.toggleClass(TOGGLE_OPT_ACTIVE_CLASS, active);
                btn.setAttr("aria-checked", active ? "true" : "false");
            }),
        );
        group.addChild(btn);
    }
    return group;
}

function buildSelectControl(meta: SlotMeta): Instance {
    const opts = meta.options ?? [];
    const optionSet: SelectOption[] = opts.map((o) => ({ value: o, label: o }));
    const fallback = optionSet[0]?.value ?? "";
    const initial = personaStore.valueOf(meta.key) ?? defaultValueOf(meta.key) ?? fallback;
    const sel = buildGlassSelect(`slot-${meta.key}`, optionSet, initial);
    const hidden = sel.el.querySelector<HTMLInputElement>(`input[name="slot-${meta.key}"]`);
    if (hidden) {
        hidden.addEventListener("change", () => personaStore.commitOrReset(meta.key, meta.type, hidden.value));
    }
    sel.trackDispose(
        effect(() => {
            const next = personaStore.valueOf(meta.key) ?? defaultValueOf(meta.key) ?? fallback;
            if (!hidden || hidden.value === next) return;
            hidden.value = next;
            const labelEl = sel.el.querySelector<HTMLElement>(`.${GLASS_SELECT_LABEL_CLASS}`);
            const labelMatch = optionSet.find((o) => o.value === next);
            if (labelEl && labelMatch) createInstance(labelEl).setText(labelMatch.label);
            for (const optEl of Array.from(sel.el.querySelectorAll<HTMLElement>(`.${GLASS_SELECT_OPTION_CLASS}`))) {
                const val = optEl.getAttribute(DATA_ATTR_VALUE);
                if (val === next) createInstance(optEl).setAttr(ATTR_ARIA_SELECTED, "true");
                else createInstance(optEl).removeAttr(ATTR_ARIA_SELECTED);
            }
        }),
    );
    return sel;
}

export function buildControl(meta: SlotMeta): Instance {
    if (meta.control === CTRL_ENTRY) return buildEntryControl(meta);
    if (meta.control === CTRL_BLOCK) return buildBlockControl(meta);
    if (meta.control === CTRL_RANGE) return buildRangeControl(meta);
    if (meta.control === CTRL_TOGGLE) return buildToggleControl(meta);
    if (meta.control === CTRL_SELECT) return buildSelectControl(meta);
    return buildNumberControl(meta);
}
