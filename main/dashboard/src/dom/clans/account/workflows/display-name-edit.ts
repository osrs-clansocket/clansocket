import { BTN_VARIANT_OUTLINE, button, input, span } from "../../../factory";
import type { MetaTag } from "../../../factory/core/semantics/meta-tags.js";
import {
    ACCOUNT_GREETING_EDIT_ROW_CLASS,
    ACCOUNT_GREETING_INPUT_CLASS,
} from "../../../../shared/constants/account-constants.js";

export interface DisplayNameEditOptions {
    nameEl: HTMLElement;
    iconEl: HTMLElement;
    onSave: (next: string) => Promise<void> | void;
    ariaLabel?: string;
    context?: string;
    maxLength?: number;
    meta?: readonly MetaTag[];
}

const DEFAULT_ARIA_LABEL = "Display name";
const DEFAULT_CONTEXT = "edit your display name";
const DEFAULT_META: readonly MetaTag[] = ["input", "account"];

export function openDisplayNameEdit(opts: DisplayNameEditOptions): void {
    const { nameEl, iconEl, onSave } = opts;
    const ariaLabel = opts.ariaLabel ?? DEFAULT_ARIA_LABEL;
    const context = opts.context ?? DEFAULT_CONTEXT;
    const meta = opts.meta ?? DEFAULT_META;
    const current = nameEl.textContent ?? "";
    const editor = input({
        classes: [ACCOUNT_GREETING_INPUT_CLASS],
        type: "text",
        maxlength: opts.maxLength === undefined ? undefined : String(opts.maxLength),
        autocomplete: "off",
        value: current,
        ariaLabel,
        context,
        meta,
    });
    const save = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Save",
        context: `save the new ${ariaLabel.toLowerCase()}`,
        meta: ["submit", "account"],
        onClick: async () => {
            const value = editor.el.value.trim();
            if (value.length === 0) {
                editor.el.focus();
                return;
            }
            await onSave(value);
            restore();
        },
    });
    const cancel = button({
        compact: true,
        text: "Cancel",
        context: `cancel editing ${ariaLabel.toLowerCase()}`,
        meta: ["action"],
        onClick: () => restore(),
    });
    const placeholder = span({ classes: [ACCOUNT_GREETING_EDIT_ROW_CLASS], context: null, meta: null }, [
        editor,
        save,
        cancel,
    ]);
    nameEl.replaceWith(placeholder.el);
    iconEl.hidden = true;
    editor.el.focus();
    editor.el.select();
    const restore = (): void => {
        placeholder.el.replaceWith(nameEl);
        iconEl.hidden = false;
    };
}
