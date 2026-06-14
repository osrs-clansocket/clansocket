import {
    BTN_VARIANT_OUTLINE,
    BTN_VARIANT_PRIMARY,
    button,
    div,
    form,
    input,
    paragraph,
    type Instance,
} from "../../../../factory";
import { clansClient, type ManagerSubmitResult } from "../../../../../state/clans/clans-client/index.js";
import { FORM_CLAIM_FORM, FORM_ERROR, FORM_FORM_ROW, FORM_HINT, FORM_INPUT } from "../../../../forms/form-classes.js";
import { createChipController } from "./chips.js";
import { createSearchController } from "./search-dropdown.js";
import { formatResultLine, MIN_SEARCH_LEN, SEARCH_DEBOUNCE_MS } from "./helpers.js";
import {
    ACCOUNT_ADD_CLAN_CLASS,
    ACCOUNT_AUTOCOMPLETE_CLASS,
    ACCOUNT_INSTRUCTIONS_CLASS,
    ACCOUNT_REQUEST_RESULT_LINE_CLASS,
    ACCOUNT_STATUS_CLASS,
} from "../../../../../shared/constants/account-constants.js";

export function buildRequestManagement(onResolved: () => void): Instance {
    const openBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Join clan as manager",
        context: "open the join-clan-as-manager form",
        meta: ["action", "clan"],
        onClick: () => {
            formEl.el.hidden = false;
            openBtn.el.hidden = true;
        },
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const clanInput = input({
        type: "text",
        autocomplete: "off",
        placeholder: "Type a clan name",
        ariaLabel: "Clan name",
        context: "search for a clan by name",
        meta: ["input", "clan"],
        onInput: () => {
            const q = clanInput.el.value.trim();
            if (debounceTimer !== null) clearTimeout(debounceTimer);
            if (q.length < MIN_SEARCH_LEN) {
                search.closeAndClear();
                return;
            }
            debounceTimer = setTimeout(() => {
                void search.runSearch(q);
            }, SEARCH_DEBOUNCE_MS);
        },
        onKeydown: (e) => {
            if (e.key === "Backspace" && clanInput.el.value.length === 0 && chips.selectedClans.size > 0) {
                e.preventDefault();
                chips.removeLast();
            }
        },
    });
    const clanField = div(
        {
            classes: [FORM_INPUT],
            context: null,
            meta: null,
            onClick: (e) => {
                if (e.target === clanField.el) clanInput.el.focus();
            },
        },
        [clanInput],
    );
    const dropdown = div({ classes: [ACCOUNT_AUTOCOMPLETE_CLASS], context: null, meta: null });
    dropdown.el.hidden = true;

    const chips = createChipController(clanField, clanInput);
    const search = createSearchController(dropdown, chips, clanInput);

    const rsnInput = input({
        classes: [FORM_INPUT],
        type: "text",
        autocomplete: "off",
        placeholder: "RSN (optional)",
        ariaLabel: "Your RSN (optional)",
        context: "enter your RSN as optional context for the request",
        meta: ["input", "rsn"],
    });
    const hintEl = paragraph({
        classes: [ACCOUNT_INSTRUCTIONS_CLASS],
        text: "Select one or more clans. Auto-granted if your verified RSN has a whitelisted rank in the clan. Otherwise existing managers approve. The RSN field is optional context.",
        context: null,
        meta: null,
    });
    const statusEl = div({ classes: [FORM_HINT, ACCOUNT_STATUS_CLASS], context: null, meta: null });
    statusEl.el.hidden = true;
    const errorEl = paragraph({ classes: [FORM_ERROR], context: null, meta: null });
    errorEl.el.hidden = true;
    const submitBtn = button({
        variant: BTN_VARIANT_PRIMARY,
        compact: true,
        type: "submit",
        text: "Submit",
        context: "submit the manager request for the selected clans",
        meta: ["submit", "clan"],
    });

    const resetForm = (): void => {
        for (const slug of [...chips.selectedClans.keys()]) chips.removeChip(slug);
        clanInput.el.value = "";
        rsnInput.el.value = "";
        search.closeAndClear();
    };

    const cancelBtn = button({
        compact: true,
        text: "Cancel",
        context: "cancel the manager request",
        meta: ["action"],
        onClick: () => {
            formEl.el.hidden = true;
            openBtn.el.hidden = false;
            errorEl.el.hidden = true;
            statusEl.el.hidden = true;
            resetForm();
        },
    });

    const formEl = form(
        {
            classes: [FORM_CLAIM_FORM],
            context: "join-clan-as-manager form — submit to request management of the selected clans",
            meta: ["submit", "clan"],
            onSubmit: async () => {
                errorEl.el.hidden = true;
                statusEl.el.hidden = true;
                if (chips.selectedClans.size === 0) {
                    errorEl.setText("Pick at least one clan from the dropdown.");
                    errorEl.el.hidden = false;
                    return;
                }
                const rsn = rsnInput.el.value.trim();
                const declaredRsn = rsn.length > 0 ? rsn : undefined;
                const targets = Array.from(chips.selectedClans.values());
                const results: ManagerSubmitResult[] = await Promise.all(
                    targets.map((t) => clansClient.requestManagement(t.slug, declaredRsn)),
                );
                statusEl.clear();
                for (let i = 0; i < results.length; i++) {
                    statusEl.addChild(
                        paragraph({
                            classes: [ACCOUNT_REQUEST_RESULT_LINE_CLASS],
                            text: formatResultLine(results[i], targets[i].displayName),
                            context: null,
                            meta: null,
                        }),
                    );
                }
                statusEl.el.hidden = false;
                resetForm();
                onResolved();
            },
        },
        [
            hintEl,
            clanField,
            dropdown,
            rsnInput,
            statusEl,
            errorEl,
            div({ classes: [FORM_FORM_ROW], context: null, meta: null }, [submitBtn, cancelBtn]),
        ],
    );
    formEl.el.hidden = true;

    return div({ classes: [ACCOUNT_ADD_CLAN_CLASS], context: null, meta: null }, [openBtn, formEl]);
}
