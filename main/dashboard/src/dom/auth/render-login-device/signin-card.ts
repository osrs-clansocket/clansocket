import { anchor, BTN_VARIANT_PRIMARY, button, div, heading, paragraph, type Instance } from "../../factory";
import { passkeyClient } from "../../../state/passkey/client";
import { isError, setStatus, statusLine } from "./helpers.js";
import { buildLinkCard } from "./link-card.js";
import { buildSignupCard } from "./signup-card.js";
import { FORM_HINT } from "../../forms/form-classes.js";
import {
    ACCOUNT_CARD_CLASS,
    ACCOUNT_SECTION_HINT_CLASS,
    ACCOUNT_SECTION_TITLE_CLASS,
} from "../../../shared/constants/account-constants.js";

export function buildRecoverLink(): Instance {
    return paragraph({ classes: [FORM_HINT], text: "Lost access to all your devices? ", context: null, meta: null }, [
        anchor({
            href: "/recover",
            data: { route: "" },
            text: "Recover with a backup code",
            context: "recover your account with a backup code",
            meta: ["nav", "account"],
        }),
    ]);
}

function buildSigninButton(status: ReturnType<typeof statusLine>, fallbackHost: Instance): Instance {
    const btn = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        text: "Sign in with this device",
        context: "sign in with a passkey on this device",
        meta: ["action", "account"],
        onClick: async () => {
            setStatus(status, "Waiting for browser passkey prompt…");
            btn.el.disabled = true;
            const result = await passkeyClient.signinWithDevice();
            btn.el.disabled = false;
            if (isError(result)) {
                setStatus(status, "No passkey on this device. Pick an option below.");
                if (fallbackHost.el.childElementCount === 0) {
                    fallbackHost.setChildren(buildSignupCard(), buildLinkCard());
                }
                return;
            }
            window.location.assign("/account");
        },
    });
    return btn;
}

export function buildSigninCard(fallbackHost: Instance): Instance {
    const status = statusLine();
    const btn = buildSigninButton(status, fallbackHost);
    return div({ classes: [ACCOUNT_CARD_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_SECTION_TITLE_CLASS], text: "Sign in", context: null, meta: null }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: "The browser will show passkeys saved on this device. Pick one to sign in.",
            context: null,
            meta: null,
        }),
        btn,
        status,
    ]);
}
