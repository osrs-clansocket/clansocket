import { BTN_VARIANT_PRIMARY, button, div, heading, input, label, paragraph, type Instance } from "../factory";
import { isPasskeyError, passkeyClient } from "../../state/passkey/client";
import { identityClient } from "../../state/identity/identity-client/index.js";
import { setStatus } from "./status-line.js";
import { FORM_FIELD_LABEL, FORM_INPUT } from "../forms/form-classes.js";
import {
    ACCOUNT_CARD_CLASS,
    ACCOUNT_EMPTY_CLASS,
    ACCOUNT_SECTION_HINT_CLASS,
    ACCOUNT_SECTION_TITLE_CLASS,
} from "../../shared/constants/account-constants.js";
import { ROUTE_ACCOUNT_CLASS, ROUTE_ROOT_CLASS } from "../../shared/constants/route-constants.js";

function buildRecoverForm(): Instance {
    const status = paragraph({ classes: [ACCOUNT_EMPTY_CLASS], text: "", context: null, meta: null });
    status.el.hidden = true;
    const codeInput = input({
        classes: [FORM_INPUT],
        ariaLabel: "Backup code",
        type: "text",
        placeholder: "XXXX-XXXX-XXXX-XXXX",
        autocomplete: "off",
        maxlength: "19",
        context: "enter your backup code",
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
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        text: "Recover account",
        context: "recover your account using the backup code",
        meta: ["action", "account"],
        onClick: async () => {
            const code = codeInput.el.value.trim();
            if (code.length === 0) {
                setStatus(status, "Backup code required.");
                return;
            }
            setStatus(status, "Verifying backup code + waiting for passkey prompt…");
            submit.el.disabled = true;
            const result = await passkeyClient.recoverWithBackupCode(code, deviceInput.el.value.trim() || null);
            submit.el.disabled = false;
            if (isPasskeyError(result)) {
                setStatus(status, `Recovery failed: ${result.message ?? result.error}`);
                return;
            }
            setStatus(status, "Recovered. Redirecting…");
            window.location.assign("/account");
        },
    });

    return div({ classes: [ACCOUNT_CARD_CLASS], context: null, meta: null }, [
        label({ classes: [FORM_FIELD_LABEL], text: "Backup code", context: null, meta: null }),
        codeInput,
        label({ classes: [FORM_FIELD_LABEL], text: "Device name (optional)", context: null, meta: null }),
        deviceInput,
        submit,
        status,
    ]);
}

async function renderRecover(): Promise<HTMLElement> {
    const session = await identityClient.session().catch(() => null);
    if (session !== null) {
        window.location.assign("/account");
        return div({ context: null, meta: null }).el;
    }
    return div({ classes: [ROUTE_ROOT_CLASS, ROUTE_ACCOUNT_CLASS], context: null, meta: null }, [
        heading("h2", { classes: [ACCOUNT_SECTION_TITLE_CLASS], text: "Recover account", context: null, meta: null }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: "Paste a backup code from the .txt file u downloaded when u signed up. A fresh passkey will be registered for this device + attached to ur account.",
            context: null,
            meta: null,
        }),
        buildRecoverForm(),
    ]).el;
}

export { renderRecover };
