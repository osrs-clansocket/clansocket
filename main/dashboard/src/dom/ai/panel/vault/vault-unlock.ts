import { div } from "../../../factory/layout-ops/index.js";
import { BTN_VARIANT_OUTLINE, button, form, input, paragraph } from "../../../factory/content-ops/index.js";
import { unlockVault, VaultDecryptError, VaultMissingError } from "../../../../ai/vault/vault/index.js";
import { setActiveKey } from "../../../../ai/vault/session.js";
import {
    FORM_CLAIM_FORM as FORM_CLASS,
    FORM_ERROR as ERROR_CLASS,
    FORM_FORM_ROW as FORM_ROW_CLASS,
    FORM_HINT as HINT_CLASS,
    FORM_INPUT as INPUT_CLASS,
    VAULT_USERNAME,
} from "../../../forms/form-classes.js";

const PASSWORD_TYPE = "password";

export interface VaultUnlockHandle {
    el: HTMLElement;
    destroy: () => void;
}

export interface VaultUnlockOpts {
    onUnlocked?: () => void;
    onCancel?: () => void;
}

function describeError(err: unknown): string {
    if (err instanceof VaultDecryptError) return "Wrong passphrase";
    if (err instanceof VaultMissingError) return "Vault not set up";
    if (err instanceof Error) return err.message;
    return String(err);
}

function renderVaultUnlock(
    bodyHost: HTMLElement,
    footerHost: HTMLElement,
    opts: VaultUnlockOpts = {},
): VaultUnlockHandle {
    const helpEl = paragraph({
        classes: [HINT_CLASS],
        text: "Encrypted store for ur AI provider keys.",
        context: null,
        meta: null,
    });

    const errorEl = paragraph({ classes: [ERROR_CLASS], context: null, meta: null });
    errorEl.el.hidden = true;

    function showError(message: string): void {
        errorEl.setText(message);
        errorEl.el.hidden = false;
    }

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
        autocomplete: "current-password",
        placeholder: "Passphrase",
        context: "enter your vault passphrase to unlock",
        meta: ["input"],
    });
    const submitBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        type: "submit",
        text: "Unlock",
        context: "unlock the encrypted key vault",
        meta: ["submit"],
    });

    async function handleSubmit(): Promise<void> {
        errorEl.el.hidden = true;
        try {
            const derived = await unlockVault(passInput.el.value);
            setActiveKey(derived);
            opts.onUnlocked?.();
        } catch (err) {
            showError(describeError(err));
        }
    }

    helpEl.mount(bodyHost);
    errorEl.mount(bodyHost);

    const cancelBtn = opts.onCancel
        ? button({
              variant: BTN_VARIANT_OUTLINE,
              compact: true,
              type: "button",
              text: "Cancel",
              context: "cancel unlocking the vault",
              meta: ["action"],
              onClick: () => opts.onCancel?.(),
          })
        : null;
    const inputRow = cancelBtn
        ? div({ classes: [FORM_ROW_CLASS], context: null, meta: null }, [passInput, submitBtn, cancelBtn])
        : div({ classes: [FORM_ROW_CLASS], context: null, meta: null }, [passInput, submitBtn]);

    const footerForm = form(
        {
            classes: [FORM_CLASS],
            context: "vault unlock form — submit to decrypt the key vault",
            meta: ["submit"],
            onSubmit: (e: SubmitEvent) => {
                e.preventDefault();
                handleSubmit().catch((err) => showError(describeError(err)));
            },
        },
        [usernameInput, inputRow],
    );

    footerForm.mount(footerHost);

    function destroy(): void {
        helpEl.destroy();
        errorEl.destroy();
        footerForm.destroy();
    }

    return { el: footerForm.el, destroy };
}

export { renderVaultUnlock };
