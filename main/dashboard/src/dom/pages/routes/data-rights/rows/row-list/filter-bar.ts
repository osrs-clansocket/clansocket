import { BTN_VARIANT_OUTLINE, button, div, span, type Instance } from "../../../../../factory/index.js";
import { glassConfirm } from "../../../../../forms/glass/modals/glass-confirm.js";
import { glassDate } from "../../../../../forms/glass/inputs/glass-date.js";
import { dateInputValue, parseDate } from "../../../../../../state/data-rights/page-state/row-helpers.js";
import type { RowListHandlers, RowListState } from "./types.js";
import { DR_FILTER_BAR_CLASS, DR_LABEL_CLASS } from "../../../../../../shared/constants/data-rights-route-constants.js";

export function buildFilterBar(state: RowListState, handlers: RowListHandlers): Instance {
    let fromVal = dateInputValue(state.from);
    let toVal = dateInputValue(state.to);
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
    const apply = button({
        variant: BTN_VARIANT_OUTLINE,
        text: "Apply",
        context: "apply the date range filter",
        meta: ["action", "data"],
        onClick: () => handlers.onFilterChange(parseDate(fromVal, false), parseDate(toVal, true)),
    });
    const clear = button({
        variant: BTN_VARIANT_OUTLINE,
        text: "Clear",
        context: "clear the date range filter",
        meta: ["action", "data"],
        onClick: () => {
            fromVal = "";
            toVal = "";
            handlers.onFilterChange(null, null);
        },
    });
    const children: Instance[] = [
        span({ classes: [DR_LABEL_CLASS], text: "Range", context: null, meta: null }),
        fromInp,
        toInp,
        apply,
        clear,
    ];
    if (state.info?.canBulkDelete && state.from !== null && state.to !== null) {
        const bulk = button({
            variant: BTN_VARIANT_OUTLINE,
            text: "Delete range",
            context: "delete all rows in the selected date range",
            meta: ["destructive", "data"],
            onClick: async () => {
                const ok = await glassConfirm({
                    title: "Delete date range",
                    message: `Delete all rows from ${state.table} between the selected dates? This is permanent.`,
                    confirmLabel: "Delete range",
                    cancelLabel: "Cancel",
                    danger: true,
                });
                if (ok) handlers.onBulkDelete(state.from!, state.to!);
            },
        });
        children.push(bulk);
    }
    return div({ classes: [DR_FILTER_BAR_CLASS], context: null, meta: null }, children);
}
