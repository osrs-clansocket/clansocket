import { div } from "../../../factory/layout-ops/index.js";
import { BTN_VARIANT_OUTLINE, button, form, input, paragraph } from "../../../factory/content-ops/index.js";
import { setupVault, MIN_PASSPHRASE_LENGTH, VaultPassphraseError } from "../../../../ai/vault/vault/index.js";
import { setActiveKey } from "../../../../ai/vault/session.js";
import {
    FORM_CLAIM_FORM as FORM_CLASS,
    FORM_ERROR as ERROR_CLASS,
    FORM_FORM_ROW as FORM_ROW_CLASS,
    FORM_FORM_ROW_FILL as FORM_ROW_FILL_CLASS,
    FORM_HINT as HINT_CLASS,
    FORM_INPUT as INPUT_CLASS,
    VAULT_USERNAME,
} from "../../../forms/form-classes.js";

const PASSWORD_TYPE = "password";

export interface VaultSetupHandle {
    el: HTMLElement;
    destroy: () => void;
}

export interface VaultSetupOpts {
    onReady?: () => void;
    onCancel?: () => void;
}

function describeError(err: unknown): string {
    if (err instanceof VaultPassphraseError) return err.message;
    if (err instanceof Error) return err.message;
    return String(err);
}

function renderVaultSetup(bodyHost: HTMLElement, footerHost: HTMLElement, opts: VaultSetupOpts = {}): VaultSetupHandle {
    const helpEl = paragraph({
        classes: [HINT_CLASS],
        context: null,
        meta: null,
        text:
            `Your AI provider keys are stored only in this browser, encrypted with a passphrase. ` +
            `Minimum ${MIN_PASSPHRASE_LENGTH} characters. ` +
            `If you lose this passphrase the vault is unrecoverable.`,
    });

    const usernameInput = input({
        ariaLabel: "Vault username",
        ariaHidden: "true",
        type: "text",
        autocomplete: "username",
        value: VAULT_USERNAME,
        readonly: "",
        hidden: "",
        tabindex: "-1",
        context: "hidden username field for password managers",
        meta: ["input"],
    });
    const passInput = input({
        classes: [INPUT_CLASS],
        ariaLabel: "Vault passphrase",
        type: PASSWORD_TYPE,
        autocomplete: "new-password",
        placeholder: "Passphrase",
        context: "enter a passphrase to encrypt your key vault",
        meta: ["input"],
    });
    const confirmInput = input({
        classes: [INPUT_CLASS],
        ariaLabel: "Confirm passphrase",
        type: PASSWORD_TYPE,
        autocomplete: "new-password",
        placeholder: "Confirm passphrase",
        context: "confirm the vault passphrase",
        meta: ["input"],
    });

    const errorEl = paragraph({ classes: [ERROR_CLASS], context: null, meta: null });
    errorEl.el.hidden = true;

    function showError(message: string): void {
        errorEl.setText(message);
        errorEl.el.hidden = false;
    }

    async function handleSubmit(): Promise<void> {
        errorEl.el.hidden = true;
        const pass = passInput.el.value;
        const confirm = confirmInput.el.value;
        if (pass !== confirm) {
            showError("Passphrases do not match");
            return;
        }
        try {
            const derived = await setupVault(pass);
            setActiveKey(derived);
            opts.onReady?.();
        } catch (err) {
            showError(describeError(err));
        }
    }

    const submitBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        type: "submit",
        text: "Create vault",
        context: "create the encrypted key vault",
        meta: ["submit"],
    });
    const buttonRow = opts.onCancel
        ? div({ classes: [FORM_ROW_CLASS, FORM_ROW_FILL_CLASS], context: null, meta: null }, [
              submitBtn,
              button({
                  variant: BTN_VARIANT_OUTLINE,
                  compact: true,
                  type: "button",
                  text: "Cancel",
                  context: "cancel vault setup",
                  meta: ["action"],
                  onClick: () => opts.onCancel?.(),
              }),
          ])
        : div({ classes: [FORM_ROW_CLASS], context: null, meta: null }, [submitBtn]);

    helpEl.mount(bodyHost);
    errorEl.mount(bodyHost);

    const footerForm = form(
        {
            classes: [FORM_CLASS],
            context: "vault setup form — submit to create the encrypted key vault",
            meta: ["submit"],
            onSubmit: (e: SubmitEvent) => {
                e.preventDefault();
                handleSubmit().catch((err) => showError(describeError(err)));
            },
        },
        [
            usernameInput,
            div({ classes: [FORM_ROW_CLASS, FORM_ROW_FILL_CLASS], context: null, meta: null }, [
                passInput,
                confirmInput,
            ]),
            buttonRow,
        ],
    );

    footerForm.mount(footerHost);

    function destroy(): void {
        helpEl.destroy();
        errorEl.destroy();
        footerForm.destroy();
    }

    return { el: footerForm.el, destroy };
}

export { renderVaultSetup };
