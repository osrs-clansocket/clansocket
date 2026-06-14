import {
    anchor,
    button,
    createInstance,
    div,
    heading,
    input,
    modal,
    paragraph,
    type Instance,
} from "../../../factory/index.js";
import { FORM_HINT as HINT_CLASS, FORM_INPUT as INPUT_CLASS } from "../../form-classes.js";
import { ACCOUNT_EMPTY_CLASS } from "../../../../shared/constants/account-constants.js";
import { GLASS_CONFIRM_HINT_TEXT_CLASS } from "../../../../shared/constants/glass-constants.js";

type SignupPromptResult = { kind: "signup"; displayName: string; deviceName: string | null } | { kind: "signin" };

const OVERLAY_CLASS = "glass-confirm__overlay";
const DIALOG_CLASS = "glass-confirm";
const OPEN_CLASS = "glass-confirm--open";
const TITLE_CLASS = "glass-confirm__title";
const MESSAGE_CLASS = "glass-confirm__message";
const ACTIONS_CLASS = "glass-confirm__actions";
const BTN_CLASS = "glass-confirm__btn";
const HINT_RIGHT_CLASS = "form__hint--right";
const NAME_MAXLEN = 64;
const CLOSE_RESOLVE_DELAY_MS = 220;

function buildTextInput(placeholder: string, maxlen: number): Instance<HTMLInputElement> {
    return input({
        classes: [INPUT_CLASS],
        ariaLabel: placeholder,
        type: "text",
        placeholder,
        autocomplete: "off",
        maxlength: String(maxlen),
        context: `enter ${placeholder}`,
        meta: ["input", "account"],
    });
}

function buildActionBtn(
    label: string,
    variant: "confirm" | "cancel",
    onClick?: () => void,
): Instance<HTMLButtonElement> {
    return button({
        classes: [BTN_CLASS, `${BTN_CLASS}--${variant}`],
        text: label,
        context: variant === "confirm" ? "confirm and continue the signup" : "cancel the signup dialog",
        meta: variant === "confirm" ? ["submit", "account"] : ["action"],
        onClick,
    });
}

interface HintLinkOpts {
    prefix: string;
    linkText: string;
    href: string;
    onClick: (e: Event) => void;
    extraClasses?: readonly string[];
}

function buildHintLink({ prefix, linkText, href, onClick, extraClasses = [] }: HintLinkOpts): Instance {
    return div({ classes: [HINT_CLASS, ...extraClasses], context: null, meta: null }, [
        paragraph({ classes: [GLASS_CONFIRM_HINT_TEXT_CLASS], text: prefix, context: null, meta: null }),
        paragraph({ context: null, meta: null }, [
            anchor({ href, text: linkText, onClick, context: linkText, meta: ["nav", "account"] }),
        ]),
    ]);
}

function buildRecoverLink(): Instance {
    return buildHintLink({
        prefix: "Lost access to all ur devices? ",
        linkText: "Recover with a backup code",
        href: "/recover",
        onClick: (e) => {
            e.preventDefault();
            window.location.assign("/recover");
        },
    });
}

function buildSigninLink(onSignin: () => void): Instance {
    return buildHintLink({
        prefix: "already registered ur device? ",
        linkText: "sign in here",
        href: "#",
        onClick: (e) => {
            e.preventDefault();
            onSignin();
        },
        extraClasses: [HINT_RIGHT_CLASS],
    });
}

function promptPasskeySignup(): Promise<SignupPromptResult | null> {
    return new Promise((resolve) => {
        let settled = false;
        const settle = (result: SignupPromptResult | null): void => {
            if (settled) return;
            settled = true;
            m.dismiss();
            window.setTimeout(() => resolve(result), CLOSE_RESOLVE_DELAY_MS);
        };
        const nameInput = buildTextInput("display name", NAME_MAXLEN);
        const deviceInput = buildTextInput("device name (optional)", NAME_MAXLEN);
        const status = paragraph({ classes: [ACCOUNT_EMPTY_CLASS], context: null, meta: null });
        status.el.hidden = true;
        const submit = (): void => {
            const display = nameInput.el.value.trim();
            if (display.length === 0) {
                status.el.hidden = false;
                status.setText("display name required.");
                nameInput.el.focus();
                return;
            }
            settle({
                kind: "signup",
                displayName: display,
                deviceName: deviceInput.el.value.trim() || null,
            });
        };
        const cancel = buildActionBtn("Cancel", "cancel", () => settle(null));
        const confirm = buildActionBtn("Continue", "confirm", submit);
        const actions = div({ classes: [ACTIONS_CLASS], context: null, meta: null }, [cancel, confirm]);
        const m = modal(
            {
                overlayClasses: [OVERLAY_CLASS],
                dialogClasses: [DIALOG_CLASS],
                openClass: OPEN_CLASS,
                context: null,
                meta: null,
                onClose: () => settle(null),
                initialFocus: () => nameInput.el,
            },
            [
                heading("h2", { classes: [TITLE_CLASS], text: "Create ClanSocket account", context: null, meta: null }),
                paragraph({
                    classes: [MESSAGE_CLASS],
                    text: "No ClanSocket passkey found on this device.",
                    context: null,
                    meta: null,
                }),
                nameInput,
                deviceInput,
                status,
                buildSigninLink(() => settle({ kind: "signin" })),
                actions,
                buildRecoverLink(),
            ],
        );
        m.dialogEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                submit();
            }
        });
        createInstance(document.body).addChild(m);
        m.open();
    });
}

export { promptPasskeySignup };
export type { SignupPromptResult };
