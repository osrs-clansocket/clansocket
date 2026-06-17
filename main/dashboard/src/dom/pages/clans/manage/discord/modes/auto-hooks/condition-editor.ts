import {
    BTN_VARIANT_BARE,
    BTN_VARIANT_OUTLINE,
    button,
    div,
    icon,
    input,
    span,
    wireChange,
    wireInput,
    type Instance,
} from "../../../../../../factory";
import { buildGlassSelect } from "../../../../../../forms/glass/inputs/glass-select.js";
import type { SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import { glassInput } from "../../../../../../forms/glass/inputs/glass-input.js";
import { FORM_INPUT } from "../../../../../../forms/form-classes.js";
import { getConditionFieldsForTrigger } from "../../../../../../../shared/constants/clan-manage-discord/condition-field-list.js";
import {
    isContainsOperator,
    isNumericOperator,
} from "../../../../../../../shared/constants/clan-manage-discord/condition-values.js";
import {
    AUTO_HOOKS_CARD_DELETE_CLASS,
    AUTO_HOOKS_CARD_LABEL_CLASS,
    AUTO_HOOKS_CARD_ROW_CLASS,
    AUTO_HOOKS_EMBED_EDITOR_CLASS,
} from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";

export interface ConditionRow {
    field: string;
    op: string;
    value: string;
}

export interface ConditionEditorCallbacks {
    onChange: (next: readonly ConditionRow[]) => void;
    getTriggerType: () => string;
    getValueOptions: (triggerType: string, field: string) => readonly string[];
    subscribeValueOptions: (listener: () => void) => () => void;
    subscribeTriggerChange: (listener: () => void) => () => void;
}

const OP_OPTIONS: SelectOption[] = [
    { value: "eq", label: "equals" },
    { value: "ne", label: "not equals" },
    { value: "gt", label: ">" },
    { value: "gte", label: ">=" },
    { value: "lt", label: "<" },
    { value: "lte", label: "<=" },
    { value: "contains", label: "contains" },
];

function buildFieldOptions(triggerType: string): SelectOption[] {
    return getConditionFieldsForTrigger(triggerType).map((f) => ({ value: f.field, label: f.label }));
}

function buildNumericInput(value: string, onUpdate: (v: string) => void): Instance {
    const inp = input({
        classes: [FORM_INPUT],
        type: "number",
        value,
        placeholder: "number",
        ariaLabel: "Condition value (number)",
        context: "numeric value to compare the field against",
        meta: ["input"],
    });
    wireInput(inp.el, () => onUpdate(inp.el.value));
    return inp;
}

function buildValueSelect(
    idx: number,
    options: readonly string[],
    current: string,
    onUpdate: (v: string) => void,
): Instance {
    const opts: SelectOption[] = options.map((v) => ({ value: v, label: v }));
    const sel = buildGlassSelect(`cond-val-${idx}`, opts, current.length > 0 ? current : (options[0] ?? ""));
    const hidden = sel.el.querySelector<HTMLInputElement>("input[type='hidden']");
    if (hidden) wireChange(hidden, () => onUpdate(hidden.value));
    return sel;
}

function buildValueText(value: string, onUpdate: (v: string) => void, placeholder: string): Instance {
    const inp = glassInput({
        value,
        placeholder,
        ariaLabel: "Condition value",
        context: "value to compare the field against",
        meta: ["input"],
    });
    wireInput(inp.el, () => onUpdate(inp.el.value));
    return inp;
}

function buildValueControl(
    idx: number,
    row: ConditionRow,
    triggerType: string,
    cb: ConditionEditorCallbacks,
    onUpdate: (v: string) => void,
): Instance {
    if (isNumericOperator(row.op)) return buildNumericInput(row.value, onUpdate);
    if (isContainsOperator(row.op)) return buildValueText(row.value, onUpdate, "substring");
    const options = cb.getValueOptions(triggerType, row.field);
    if (options.length > 0) return buildValueSelect(idx, options, row.value, onUpdate);
    return buildValueText(row.value, onUpdate, "no observed values yet");
}

interface RowContext {
    idx: number;
    row: ConditionRow;
    triggerType: string;
    fields: SelectOption[];
    cb: ConditionEditorCallbacks;
    onUpdate: (next: ConditionRow) => void;
    onValueUpdate: (next: ConditionRow) => void;
    onDelete: () => void;
}

function buildRow(ctx: RowContext): Instance {
    const fieldSel = buildGlassSelect(`cond-field-${ctx.idx}`, ctx.fields, ctx.row.field);
    const fieldHidden = fieldSel.el.querySelector<HTMLInputElement>("input[type='hidden']");
    if (fieldHidden) wireChange(fieldHidden, () => ctx.onUpdate({ ...ctx.row, field: fieldHidden.value, value: "" }));
    const opSel = buildGlassSelect(`cond-op-${ctx.idx}`, OP_OPTIONS, ctx.row.op);
    const opHidden = opSel.el.querySelector<HTMLInputElement>("input[type='hidden']");
    if (opHidden) wireChange(opHidden, () => ctx.onUpdate({ ...ctx.row, op: opHidden.value, value: "" }));
    const valueCtrl = buildValueControl(ctx.idx, ctx.row, ctx.triggerType, ctx.cb, (v) =>
        ctx.onValueUpdate({ ...ctx.row, value: v }),
    );
    const delBtn = button(
        {
            variant: BTN_VARIANT_BARE,
            classes: [AUTO_HOOKS_CARD_DELETE_CLASS],
            ariaLabel: "Remove condition",
            context: "remove this condition row",
            meta: ["action", "destructive"],
            onClick: ctx.onDelete,
        },
        [icon({ name: "trash", context: null, meta: null }).el],
    );
    return div({ classes: [AUTO_HOOKS_CARD_ROW_CLASS], context: null, meta: null }, [
        fieldSel,
        opSel,
        valueCtrl,
        delBtn,
    ]);
}

export function parseConditions(json: string | null): ConditionRow[] {
    if (json === null || json.length === 0) return [];
    try {
        const arr = JSON.parse(json) as ConditionRow[];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export function serializeConditions(rows: readonly ConditionRow[]): string | null {
    const active = rows.filter((r) => r.field.length > 0 && r.op.length > 0);
    if (active.length === 0) return null;
    return JSON.stringify(active);
}

function pickDefaultField(triggerType: string, fields: SelectOption[], cb: ConditionEditorCallbacks): string {
    for (const f of fields) {
        if (cb.getValueOptions(triggerType, f.value).length > 0) return f.value;
    }
    return fields[0]?.value ?? "";
}

interface EditorState {
    rows: ConditionRow[];
}

function buildAddBtn(
    triggerType: string,
    fields: SelectOption[],
    state: EditorState,
    cb: ConditionEditorCallbacks,
    rerender: () => void,
): Instance {
    return button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "+ Add condition",
        context: "add a new condition row",
        meta: ["action"],
        onClick: () => {
            state.rows.push({ field: pickDefaultField(triggerType, fields, cb), op: "eq", value: "" });
            cb.onChange([...state.rows]);
            rerender();
        },
    });
}

export function buildConditionEditor(initial: readonly ConditionRow[], cb: ConditionEditorCallbacks): Instance {
    const state: EditorState = { rows: [...initial] };
    const host = div({ classes: [AUTO_HOOKS_EMBED_EDITOR_CLASS], context: null, meta: null });

    function rerender(): void {
        const triggerType = cb.getTriggerType();
        const fields = buildFieldOptions(triggerType);
        const rowEls = state.rows.map((row, idx) =>
            buildRow({
                idx,
                row,
                triggerType,
                fields,
                cb,
                onUpdate: (next) => {
                    state.rows[idx] = next;
                    cb.onChange([...state.rows]);
                    rerender();
                },
                onValueUpdate: (next) => {
                    state.rows[idx] = next;
                    cb.onChange([...state.rows]);
                },
                onDelete: () => {
                    state.rows = state.rows.filter((_, i) => i !== idx);
                    cb.onChange([...state.rows]);
                    rerender();
                },
            }),
        );
        host.setChildren(
            span({ classes: [AUTO_HOOKS_CARD_LABEL_CLASS], text: "Conditions", context: null, meta: null }),
            ...rowEls,
            buildAddBtn(triggerType, fields, state, cb, rerender),
        );
    }

    const unsubscribeValues = cb.subscribeValueOptions(rerender);
    const unsubscribeTrigger = cb.subscribeTriggerChange(() => {
        state.rows = [];
        cb.onChange([]);
        rerender();
    });
    host.trackDispose({
        dispose: () => {
            unsubscribeValues();
            unsubscribeTrigger();
        },
    });
    rerender();
    return host;
}
