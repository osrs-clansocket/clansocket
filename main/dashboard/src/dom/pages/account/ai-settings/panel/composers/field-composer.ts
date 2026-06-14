import { div, effect, label, span, type Instance } from "../../../../../factory";
import { modesStore } from "../../../../../../ai/modes-store/index.js";
import { SLOT_BY_KEY, type SlotMeta } from "../../../../../../ai/persona-store/index.js";
import type { ConcernRow } from "../../../../../../state/ai-settings/panel-defs.js";
import { ATTR_HIDDEN, HIDDEN_FALSE, HIDDEN_TRUE } from "../../shared.js";
import { buildControl, buildResetButton } from "../builders/control-builder.js";
import { buildTipIcon } from "./tip-composer.js";

const ROW_CLASS = "account-ai-settings__row";
const FIELD_CLASS = "account-ai-settings__field";
const FIELD_HEAD_CLASS = "account-ai-settings__field-head";
const FIELD_LABEL_CLASS = "account-ai-settings__field-label";
const FIELD_DESC_CLASS = "account-ai-settings__field-desc";

function buildField(meta: SlotMeta): Instance {
    const labelEl = label({
        htmlFor: `slot-${meta.key}`,
        classes: [FIELD_LABEL_CLASS],
        text: meta.displayName,
        context: null,
        meta: null,
    });
    const tipIcon = buildTipIcon(meta);
    const reset = buildResetButton(meta);
    const headChildren: Instance[] = tipIcon !== null ? [labelEl, tipIcon, reset] : [labelEl, reset];
    const head = div({ classes: [FIELD_HEAD_CLASS], context: null, meta: null }, headChildren);
    const desc = span({ classes: [FIELD_DESC_CLASS], text: meta.description, context: null, meta: null });
    const field = div({ classes: [FIELD_CLASS], context: null, meta: null }, [head, desc, buildControl(meta)]);
    if (meta.requiresMode !== undefined) {
        const required = meta.requiresMode as Parameters<typeof modesStore.isOn>[0];
        field.trackDispose(
            effect(() => {
                field.setAttr(ATTR_HIDDEN, modesStore.isOn(required) ? HIDDEN_FALSE : HIDDEN_TRUE);
            }),
        );
    }
    return field;
}

export function buildRow(row: ConcernRow): Instance {
    const keys = typeof row === "string" ? [row] : row;
    const rowEl = div({ classes: [ROW_CLASS], context: null, meta: null });
    for (const k of keys) {
        const meta = SLOT_BY_KEY.get(k);
        if (!meta) throw new Error(`unknown slot: ${k}`);
        rowEl.addChild(buildField(meta));
    }
    return rowEl;
}
