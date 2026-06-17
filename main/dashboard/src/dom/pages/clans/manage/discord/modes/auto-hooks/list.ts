import { div, paragraph, type Instance } from "../../../../../../factory";
import type { AutoHookRow } from "../../../../../../../state/discord/auto-hooks/client.js";
import type { SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import {
    AUTO_HOOKS_EMPTY_CLASS,
    AUTO_HOOKS_LIST_CLASS,
    EMPTY_LIST_TEXT,
} from "../../../../../../../shared/constants/clan-manage-discord/auto-hook-constants.js";
import { buildAutoHookCard, type CardCallbacks } from "./card.js";

export interface ListOptions {
    rows: readonly AutoHookRow[];
    triggerOptions: SelectOption[];
    webhookOptions: SelectOption[];
    cb: CardCallbacks;
    getValueOptions: (triggerType: string, field: string) => readonly string[];
    subscribeValueOptions: (listener: () => void) => () => void;
}

export function buildAutoHooksList(opts: ListOptions): Instance {
    const { rows, triggerOptions, webhookOptions, cb, getValueOptions, subscribeValueOptions } = opts;
    const cards = rows.map((row) =>
        buildAutoHookCard({ row, triggerOptions, webhookOptions, cb, getValueOptions, subscribeValueOptions }),
    );
    const empty = paragraph({
        classes: [AUTO_HOOKS_EMPTY_CLASS],
        text: EMPTY_LIST_TEXT,
        hidden: rows.length === 0 ? undefined : "",
        context: null,
        meta: null,
    });
    return div({ classes: [AUTO_HOOKS_LIST_CLASS], context: null, meta: null }, [...cards, empty]);
}
