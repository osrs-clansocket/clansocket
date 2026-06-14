import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    heading,
    input,
    label,
    paragraph,
    snapshot,
    type Instance,
} from "../../factory";
import { passkeyClient, LINK_CODE_DIGITS } from "../../../state/passkey/client";
import { isError, setStatus, statusLine } from "./helpers.js";
import { FORM_FIELD_LABEL, FORM_INPUT } from "../../forms/form-classes.js";
import {
    ACCOUNT_CARD_CLASS,
    ACCOUNT_SECTION_HINT_CLASS,
    ACCOUNT_SECTION_TITLE_CLASS,
} from "../../../shared/constants/account-constants.js";

export function buildLinkCard(): Instance {
    const status = statusLine();
    const codeInput = input({
        classes: [FORM_INPUT],
        ariaLabel: `${LINK_CODE_DIGITS}-digit link code`,
        type: "text",
        placeholder: `${LINK_CODE_DIGITS}-digit code`,
        autocomplete: "off",
        maxlength: String(LINK_CODE_DIGITS),
        inputmode: "numeric",
        context: "enter the device-link code from your existing device",
        meta: ["input", "device"],
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
        text: "Link this device",
        context: "link this device to your existing account",
        meta: ["action", "device"],
        onClick: async () => {
            const code = codeInput.el.value.trim();
            if (code.length === 0) {
                setStatus(status, "Link code required.");
                return;
            }
            setStatus(status, "Verifying code + waiting for passkey prompt…");
            submit.el.disabled = true;
            const result = await passkeyClient.redeemLinkCode(code, deviceInput.el.value.trim() || null);
            submit.el.disabled = false;
            if (isError(result)) {
                setStatus(status, `Link failed: ${result.message ?? result.error}`);
                return;
            }
            window.location.assign("/account");
        },
    });
    return div({ classes: [ACCOUNT_CARD_CLASS], context: null, meta: null }, [
        heading("h3", {
            classes: [ACCOUNT_SECTION_TITLE_CLASS],
            text: "Link this device to an existing account",
            context: null,
            meta: null,
        }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: snapshot(
                `On the device that already has access: account → sign-in devices → Link code. Paste the ${LINK_CODE_DIGITS} digits here.`,
            ),
            context: null,
            meta: null,
        }),
        label({ classes: [FORM_FIELD_LABEL], text: "Link code", context: null, meta: null }),
        codeInput,
        label({ classes: [FORM_FIELD_LABEL], text: "Device name (optional)", context: null, meta: null }),
        deviceInput,
        submit,
        status,
    ]);
}
