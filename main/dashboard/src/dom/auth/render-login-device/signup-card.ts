import { BTN_VARIANT_OUTLINE, button, div, heading, input, label, paragraph, type Instance } from "../../factory";
import { passkeyClient } from "../../../state/passkey/client";
import { DISPLAY_NAME_MAX_LEN } from "../../../state/identity/identity-client/index.js";
import { isError, setStatus, statusLine } from "./helpers.js";
import { FORM_FIELD_LABEL, FORM_INPUT } from "../../forms/form-classes.js";
import {
    ACCOUNT_CARD_CLASS,
    ACCOUNT_SECTION_HINT_CLASS,
    ACCOUNT_SECTION_TITLE_CLASS,
} from "../../../shared/constants/account-constants.js";

export function buildSignupCard(): Instance {
    const status = statusLine();
    const nameInput = input({
        classes: [FORM_INPUT],
        ariaLabel: "Your display name",
        type: "text",
        placeholder: "Your display name",
        autocomplete: "off",
        maxlength: String(DISPLAY_NAME_MAX_LEN),
        context: "enter your display name",
        meta: ["input", "account"],
    });
    const deviceInput = input({
        classes: [FORM_INPUT],
        ariaLabel: "This device's name (optional)",
        type: "text",
        placeholder: "This device's name (optional)",
        autocomplete: "off",
        maxlength: "64",
        context: "name for this device (optional)",
        meta: ["input", "device"],
    });
    const submit = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Create account + add this device",
        context: "create your account and register a passkey for this device",
        meta: ["action", "account"],
        onClick: async () => {
            const display = nameInput.el.value.trim();
            if (display.length === 0) {
                setStatus(status, "Display name required.");
                return;
            }
            setStatus(status, "Creating account + waiting for passkey prompt…");
            submit.el.disabled = true;
            const result = await passkeyClient.signupWithDevice(display, deviceInput.el.value.trim() || null);
            submit.el.disabled = false;
            if (isError(result)) {
                setStatus(status, `Signup failed: ${result.message ?? result.error}`);
                return;
            }
            sessionStorage.setItem(
                "clansocket:fresh-backup-codes",
                JSON.stringify({ codes: result.backupCodes ?? [], file: result.backupCodesFile ?? "" }),
            );
            window.location.assign("/account");
        },
    });
    return div({ classes: [ACCOUNT_CARD_CLASS], context: null, meta: null }, [
        heading("h3", {
            classes: [ACCOUNT_SECTION_TITLE_CLASS],
            text: "Add device passkey",
            context: null,
            meta: null,
        }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: "Pick a display name + register a passkey for this device. Backup codes will be shown once on the next page.",
            context: null,
            meta: null,
        }),
        label({ classes: [FORM_FIELD_LABEL], text: "Display name", context: null, meta: null }),
        nameInput,
        label({ classes: [FORM_FIELD_LABEL], text: "Device name (optional)", context: null, meta: null }),
        deviceInput,
        submit,
        status,
    ]);
}
