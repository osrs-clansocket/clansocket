import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    span,
    type Instance,
} from "../../../../../factory/index.js";
import { glassDate } from "../../../../../forms/glass/inputs/glass-date.js";
import { glassInput } from "../../../../../forms/glass/inputs/glass-input.js";
import { dateInputValue, parseDate } from "../../../../../../state/data-rights/page-state/row-helpers.js";
import type { RowListHandlers, RowListState } from "./types.js";
import { DR_FILTER_BAR_CLASS, DR_LABEL_CLASS } from "../../../../../../shared/constants/data-rights-route-constants.js";

function normalizeRsn(raw: string): string | null {
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
}

export function buildFilterBar(state: RowListState, handlers: RowListHandlers): Instance {
    let fromVal = dateInputValue(state.from);
    let toVal = dateInputValue(state.to);
    let rsnVal = state.rsn ?? "";
    const fromInp = glassDate({
        value: fromVal,
        placeholder: "From",
        onChange: (v) => {
            fromVal = v;
        },
    });
    const toInp = glassDate({
        value: toVal,
        placeholder: "To",
        onChange: (v) => {
            toVal = v;
        },
    });
    const rsnInp = glassInput({
        value: rsnVal,
        placeholder: "Filter by RSN…",
        ariaLabel: "Filter by RSN substring",
        autocomplete: "off",
        onInput: (e) => {
            rsnVal = (e.target as HTMLInputElement).value;
        },
    });
    rsnInp.el.style.flex = "1";
    rsnInp.el.style.minInlineSize = "0";
    const applyFilter = (): void => {
        handlers.onFilterChange(parseDate(fromVal, false), parseDate(toVal, true), normalizeRsn(rsnVal));
    };
    rsnInp.el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applyFilter();
    });
    const apply = button({
        variant: BTN_VARIANT_OUTLINE,
        text: "Apply",
        context: "apply the date range and RSN filter",
        meta: ["action", "data"],
        onClick: applyFilter,
    });
    const clear = button({
        variant: BTN_VARIANT_OUTLINE,
        text: "Clear",
        context: "clear the date range and RSN filter",
        meta: ["action", "data"],
        onClick: () => {
            fromVal = "";
            toVal = "";
            rsnVal = "";
            rsnInp.el.value = "";
            handlers.onFilterChange(null, null, null);
        },
    });
    const children: Instance[] = [
        span({ classes: [DR_LABEL_CLASS], text: "Range", context: null, meta: null }),
        fromInp,
        toInp,
        rsnInp,
        apply,
        clear,
    ];
    if (state.info?.canBulkDelete && state.from !== null && state.to !== null) {
        const bulkHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
        const bulk = button({
            variant: BTN_VARIANT_OUTLINE,
            text: "Delete range",
            context: "delete all rows in the selected date range",
            meta: ["destructive", "data"],
            onClick: async () => {
                const ok = await inlineConfirm(bulkHost, {
                    cancelLabel: "Cancel",
                    confirmLabel: "Delete range",
                    danger: true,
                    cancelContext: `keep rows in ${state.table}`,
                    confirmContext: `confirm deleting rows from ${state.table}`,
                });
                if (ok) handlers.onBulkDelete(state.from!, state.to!);
            },
        });
        bulkHost.addChild(bulk);
        children.push(bulkHost);
    }
    return div({ classes: [DR_FILTER_BAR_CLASS], context: null, meta: null }, children);
}
