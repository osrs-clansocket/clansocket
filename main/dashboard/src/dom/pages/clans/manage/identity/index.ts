import "../../../../../styles/pages/account/index.css";
import "../../../../../styles/pages/clans/manage/identity/identity-page.css";
import { div, heading } from "../../../../factory";
import { clansStore } from "../../../../../state/clans/stores/clans-store.js";
import { buildBrandingControls } from "../../../../clans/account/branding/branding-controls.js";
import { buildSeoPanel } from "./seo-panel.js";
import {
    ACCOUNT_CLAN_BRANDING_SECTION_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
} from "../../../../../shared/constants/account-constants.js";

const ROOT_CLASS = "clans-manage__identity";

export function buildIdentityTab(slug: string): HTMLElement {
    const host = div({ classes: [ROOT_CLASS], context: null, meta: null });
    const clan = clansStore.managed$().find((c) => c.slug === slug);
    if (clan === undefined) return host.el;
    host.setChildren(
        div({ classes: [ACCOUNT_CLAN_BRANDING_SECTION_CLASS], context: null, meta: null }, [
            heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Branding", context: null, meta: null }),
            buildBrandingControls(clan),
        ]),
        buildSeoPanel(slug),
    );
    return host.el;
}
