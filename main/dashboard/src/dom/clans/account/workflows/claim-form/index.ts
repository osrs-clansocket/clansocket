import { BTN_VARIANT_PRIMARY, button, div, form, input, label, paragraph, snapshot, span } from "../../../../factory";
import { clansClient } from "../../../../../state/clans/clans-client/index.js";
import {
    FORM_CLAIM_FORM,
    FORM_ERROR,
    FORM_FIELD,
    FORM_FIELD_LABEL,
    FORM_FORM_ROW,
    FORM_INPUT,
} from "../../../../forms/form-classes.js";
import { recordToActive, type ActiveClaim } from "../claim-banner";
import type { ConsentRecord } from "../../../../../state/identity/consent/consent-client.js";
import {
    ACCOUNT_ADD_CLAN_FORM_CLASS,
    ACCOUNT_INSTRUCTIONS_CLASS,
} from "../../../../../shared/constants/account-constants.js";

export interface ClaimFormCallbacks {
    onSuccess: (claim: ActiveClaim) => void;
    onCancel: () => void;
}

export interface ClaimFormHandle {
    el: HTMLElement;
    show: () => void;
    hide: () => void;
}

export function buildClaimForm(callbacks: ClaimFormCallbacks): ClaimFormHandle {
    const errorEl = paragraph({ classes: [FORM_ERROR], context: null, meta: null });
    errorEl.el.hidden = true;

    const rsnInput = input({
        classes: [FORM_INPUT],
        type: "text",
        required: "",
        autocomplete: "off",
        placeholder: "Zezima",
        ariaLabel: "Your RSN",
        context: "enter your RSN (must hold owner or deputy owner in the clan)",
        meta: ["input", "rsn"],
    });

    function reset(): void {
        rsnInput.el.value = "";
        errorEl.el.hidden = true;
    }

    async function handleSubmit(): Promise<void> {
        errorEl.el.hidden = true;
        const rsn = rsnInput.el.value.trim();
        if (rsn.length === 0) {
            errorEl.setText("RSN is required.");
            errorEl.el.hidden = false;
            return;
        }
        const result = await clansClient.createClaim(rsn);
        if (!result.ok) {
            errorEl.setText(snapshot(result.message ?? `claim submission failed (${result.reason}).`));
            errorEl.el.hidden = false;
            return;
        }
        const claim: ActiveClaim = recordToActive({
            id: result.requestId,
            kind: "claim",
            targetRsn: rsn,
            declaredClanName: result.clanName,
            declaredClanSlug: null,
            status: "pending",
            createdAt: Date.now(),
            expiresAt: result.expiresAt,
            resolvedAt: null,
        } as ConsentRecord);
        reset();
        callbacks.onSuccess(claim);
    }

    const submitBtn = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        type: "submit",
        text: "Submit claim",
        context: "submit the clan claim for verification",
        meta: ["submit", "clan"],
    });
    const cancelBtn = button({
        compact: true,
        text: "Cancel",
        context: "cancel the clan claim",
        meta: ["action"],
        onClick: () => {
            reset();
            callbacks.onCancel();
        },
    });

    const claimForm = form(
        {
            classes: [FORM_CLAIM_FORM],
            context: "claim-a-clan form — submit to request owner/deputy verification via the plugin",
            meta: ["submit", "clan"],
            onSubmit: () => handleSubmit(),
        },
        [
            paragraph({
                classes: [ACCOUNT_INSTRUCTIONS_CLASS],
                text: "Log into RuneLite as the RSN that holds Owner or Deputy Owner in this clan, then submit. The plugin will report ur active clan automatically and a confirm prompt appears in the side panel within seconds.",
                context: null,
                meta: null,
            }),
            label({ classes: [FORM_FIELD], context: null, meta: null }, [
                span({ classes: [FORM_FIELD_LABEL], text: "Your RSN", context: null, meta: null }),
                rsnInput,
            ]),
            errorEl,
            div({ classes: [FORM_FORM_ROW], context: null, meta: null }, [submitBtn, cancelBtn]),
        ],
    );

    const wrapper = div({ classes: [ACCOUNT_ADD_CLAN_FORM_CLASS], context: null, meta: null }, [claimForm]);
    wrapper.el.hidden = true;

    return {
        el: wrapper.el,
        show: () => {
            wrapper.el.hidden = false;
        },
        hide: () => {
            wrapper.el.hidden = true;
            reset();
        },
    };
}
