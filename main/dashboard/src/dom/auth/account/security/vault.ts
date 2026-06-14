import { div, heading } from "../../../factory/index.js";
import { renderKeySettings } from "../../../ai/panel/vault/key-settings/index.js";
import {
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_PANEL_BODY_CLASS,
    ACCOUNT_PANEL_FOOTER_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
} from "../../../../shared/constants/account-constants.js";

export function buildVaultPanel(): HTMLElement {
    const body = div({ classes: [ACCOUNT_PANEL_BODY_CLASS], context: null, meta: null });
    const footer = div({ classes: [ACCOUNT_PANEL_FOOTER_CLASS], context: null, meta: null });
    renderKeySettings(body.el, footer.el).catch(() => undefined);
    return div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Vault", context: null, meta: null }),
        body,
        footer,
    ]).el;
}
