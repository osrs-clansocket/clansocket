import { div, effect, heading, paragraph } from "../../../../factory/index.js";
import { identificationStore } from "../../../../../state/identity/stores/identification-store.js";
import { buildClaimForm, createRsnListRenderer } from "./forms.js";
import { FORM_HINT } from "../../../../forms/form-classes.js";
import {
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_LIST_CLASS,
    ACCOUNT_PANEL_BODY_CLASS,
    ACCOUNT_PANEL_FOOTER_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
} from "../../../../../shared/constants/account-constants.js";

export function buildIdentityPanel(): HTMLElement {
    const status = paragraph({ classes: [FORM_HINT], text: "", context: null, meta: null });
    status.el.hidden = true;
    const rsnHost = div({ classes: [ACCOUNT_LIST_CLASS], context: null, meta: null });
    const refresh = (): void => void identificationStore.refresh();
    const root = div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "RSNs", context: null, meta: null }),
        div({ classes: [ACCOUNT_PANEL_BODY_CLASS], context: null, meta: null }, [rsnHost, status]),
        div({ classes: [ACCOUNT_PANEL_FOOTER_CLASS], context: null, meta: null }, [buildClaimForm(refresh, status)]),
    ]);
    const rsnRenderer = createRsnListRenderer(rsnHost, refresh, status);
    root.trackDispose(effect(() => rsnRenderer.render(identificationStore.identification$())));
    return root.el;
}
