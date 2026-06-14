import { BTN_VARIANT_OUTLINE, button, div, span, type Instance } from "../../../../../factory/index.js";
import type { RowListHandlers, RowListState } from "./types.js";
import {
    DR_PANE_HEADER_CLASS,
    DR_PANE_TITLE_CLASS,
    DR_ROW_META_CLASS,
} from "../../../../../../shared/constants/data-rights-route-constants.js";

export interface HeaderRefs {
    instance: Instance;
    countSpan: Instance | null;
}

export function buildHeader(state: RowListState, handlers: RowListHandlers): HeaderRefs {
    const children: Instance[] = [];
    if (handlers.onBack) {
        children.push(
            button({
                variant: BTN_VARIANT_OUTLINE,
                text: "← Databases",
                context: "go back to the databases tree",
                meta: ["nav", "data"],
                onClick: () => handlers.onBack!(),
            }),
        );
    }
    children.push(span({ classes: [DR_PANE_TITLE_CLASS], text: state.table, context: null, meta: null }));
    let countSpan: Instance | null = null;
    if (state.info) {
        countSpan = span({
            classes: [DR_ROW_META_CLASS],
            text: `${state.rows.length}${state.hasMore ? "+" : ""} of ${state.info.total}`,
            context: null,
            meta: null,
        });
        children.push(countSpan);
    }
    return {
        instance: div({ classes: [DR_PANE_HEADER_CLASS], context: null, meta: null }, children),
        countSpan,
    };
}
