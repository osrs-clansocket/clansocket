import { button, createInstance, div } from "../../../factory";
import { renderVaultSetup } from "./vault-setup.js";
import { renderVaultUnlock } from "./vault-unlock.js";
import { renderAddKeyForm } from "./add-key-form";
import { mountQuipCard, type QuipCardHandle } from "../quips/core/quip-card.js";
import type { QuipSet } from "../quips/core/quip-types.js";
import { VAULT_LOCKED_QUIPS } from "../quips/vault-locked-quip.js";
import { VAULT_NO_KEY_QUIPS } from "../quips/vault-no-key-quip.js";
import { VAULT_SETUP_QUIPS } from "../quips/vault-setup-quip.js";

export type VaultState = "no-vault" | "locked" | "no-key";

const CARD_CLASS = "ai-bar__auth-card";
const BTN_CLASS = "ai-bar__auth-btn";
const GATE_CLASS = "ai-bar__vault-gate";
const FORM_WRAP_CLASS = "ai-bar__vault-form";

interface Copy {
    readonly quipSet: QuipSet;
    readonly btn: string;
}

const COPY: Record<VaultState, Copy> = {
    "no-vault": { quipSet: VAULT_SETUP_QUIPS, btn: "Set up vault" },
    locked: { quipSet: VAULT_LOCKED_QUIPS, btn: "Enter passphrase" },
    "no-key": { quipSet: VAULT_NO_KEY_QUIPS, btn: "Set AI key" },
};

const teardownByContainer = new WeakMap<HTMLElement, () => void>();

function clearGate(container: HTMLElement): void {
    const previousTeardown = teardownByContainer.get(container);
    if (previousTeardown) {
        previousTeardown();
        teardownByContainer.delete(container);
    } else {
        const card = container.querySelector<HTMLElement>(`.${CARD_CLASS}`);
        if (card) createInstance(card).destroy();
    }
    const formWrap = container.querySelector<HTMLElement>(`.${FORM_WRAP_CLASS}`);
    if (formWrap) createInstance(formWrap).destroy();
}

function mountForm(container: HTMLElement, state: VaultState): void {
    clearGate(container);
    const wrap = div({ classes: [FORM_WRAP_CLASS], context: null, meta: null });
    createInstance(container).addChild(wrap);
    const onCancel = (): void => {
        wrap.destroy();
        showVaultGate(container, state);
    };
    if (state === "no-vault") renderVaultSetup(wrap.el, wrap.el, { onCancel });
    else if (state === "locked") renderVaultUnlock(wrap.el, wrap.el, { onCancel });
    else renderAddKeyForm(wrap.el, { onCancel });
}

export function showVaultGate(container: HTMLElement, state: VaultState): void {
    clearGate(container);
    const copy = COPY[state];
    const action = button({
        classes: [BTN_CLASS, `${BTN_CLASS}--vault`],
        text: copy.btn,
        context: "open the vault setup, unlock, or add-key form",
        meta: ["action"],
        onClick: () => mountForm(container, state),
    });
    const handle: QuipCardHandle = mountQuipCard({
        quipSet: copy.quipSet,
        actions: [action],
        extraCardClasses: [GATE_CLASS],
    });
    teardownByContainer.set(container, handle.teardown);
    createInstance(container).addChild(handle.card);
}

export function hideVaultGate(container: HTMLElement): void {
    clearGate(container);
}
