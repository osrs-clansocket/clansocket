import { button, div, span, type Instance } from "../../../../factory";
import { KIND_FILTERS, RANGE_FILTERS } from "../../../../../state/clans/audit/filter-defs.js";
import { AUDIT_FILTERS_CLASS } from "../../../../../shared/constants/audit-route-constants.js";
import {
    TOOLBAR_CHIP_ACTIVE_CLASS,
    TOOLBAR_CHIP_CLASS,
    TOOLBAR_CLASS,
    TOOLBAR_GROUP_CLASS,
    TOOLBAR_LABEL_CLASS,
} from "../../../../../shared/constants/toolbar-component-constants.js";

export interface FilterBarState {
    activeKind: string;
    activeRange: string;
}

interface FilterChipOpts {
    state: FilterBarState;
    f: { key: string; label: string };
    activeKeyField: "activeKind" | "activeRange";
    dataKey: "filter-key" | "filter-range";
    onChange: (key: string) => void;
}

function buildFilterChip({ state, f, activeKeyField, dataKey, onChange }: FilterChipOpts): Instance {
    return button({
        classes: [TOOLBAR_CHIP_CLASS, ...(f.key === state[activeKeyField] ? [TOOLBAR_CHIP_ACTIVE_CLASS] : [])],
        text: f.label,
        data: { [dataKey]: f.key },
        context: `filter the audit log by ${f.label}`,
        meta: ["choice", "audit"],
        onClick: () => onChange(f.key),
    });
}

export function buildFilterBar(
    state: FilterBarState,
    onKindChange: (key: string) => void,
    onRangeChange: (key: string) => void,
    integrityHost: Instance,
): Instance {
    const kindGroup = div({ classes: [TOOLBAR_GROUP_CLASS], context: null, meta: null }, [
        span({ classes: [TOOLBAR_LABEL_CLASS], text: "Kind", context: null, meta: null }),
        ...KIND_FILTERS.map((f) =>
            buildFilterChip({ state, f, activeKeyField: "activeKind", dataKey: "filter-key", onChange: onKindChange }),
        ),
    ]);
    const rangeGroup = div({ classes: [TOOLBAR_GROUP_CLASS], context: null, meta: null }, [
        span({ classes: [TOOLBAR_LABEL_CLASS], text: "Since", context: null, meta: null }),
        ...RANGE_FILTERS.map((f) =>
            buildFilterChip({
                state,
                f,
                activeKeyField: "activeRange",
                dataKey: "filter-range",
                onChange: onRangeChange,
            }),
        ),
    ]);
    return div({ classes: [TOOLBAR_CLASS, AUDIT_FILTERS_CLASS], context: null, meta: null }, [
        kindGroup,
        rangeGroup,
        integrityHost,
    ]);
}
