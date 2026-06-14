import { BTN_VARIANT_OUTLINE, button, input, span } from "../../../factory";
import { DISPLAY_NAME_MAX_LEN, identityClient } from "../../../../state/identity/identity-client/index.js";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import {
    ACCOUNT_GREETING_EDIT_ROW_CLASS,
    ACCOUNT_GREETING_INPUT_CLASS,
} from "../../../../shared/constants/account-constants.js";

export function openDisplayNameEdit(host: HTMLElement, nameEl: HTMLElement, iconEl: HTMLElement): void {
    const current = nameEl.textContent ?? "";
    const editor = input({
        classes: [ACCOUNT_GREETING_INPUT_CLASS],
        type: "text",
        maxlength: String(DISPLAY_NAME_MAX_LEN),
        autocomplete: "off",
        value: current,
        ariaLabel: "Display name",
        context: "edit your display name",
        meta: ["input", "account"],
    });
    const save = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Save",
        context: "save the new display name",
        meta: ["submit", "account"],
        onClick: async () => {
            const value = editor.el.value.trim();
            if (value.length === 0) {
                editor.el.focus();
                return;
            }
            const result = await identityClient.updateDisplayName(value);
            if (result.ok) await identityStore.refresh();
            restore();
        },
    });
    const cancel = button({
        compact: true,
        text: "Cancel",
        context: "cancel editing the display name",
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
    void host;
}
