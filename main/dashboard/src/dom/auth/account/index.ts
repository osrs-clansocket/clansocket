import "../../../styles/components/cards/card-grid-component.css";
import "../../../styles/components/cards/surface-card-component.css";
import { div, heading, section } from "../../factory";
import { buildIdentityPanel } from "./identity/identity/index.js";
import { buildLinkedAccountsPanel } from "./identity/linked-accounts.js";
import { buildDevicesPanel } from "./security/devices.js";
import { buildBackupCodesPanel } from "./security/backup-codes.js";
import { buildDataRightsPanel } from "./data-rights";
import { buildConsentPanel } from "./consent";
import { buildVaultPanel } from "./security/vault.js";
import { buildLegacyRsnPanel } from "./identity/legacy-rsn.js";
import { ACCOUNT_CARD_CLASS, ACCOUNT_SECTION_TITLE_CLASS } from "../../../shared/constants/account-constants.js";
import { CARD_GRID_CLASS, SURFACE_CARD_CLASS } from "../../../shared/constants/card-component-constants.js";

function wrapAsCard(child: HTMLElement): HTMLElement {
    return div({ classes: [SURFACE_CARD_CLASS], context: null, meta: null }, [child]).el;
}

export function buildClanSocketAccountSection(): HTMLElement {
    return section({ classes: [ACCOUNT_CARD_CLASS], context: null, meta: null }, [
        heading("h2", {
            classes: [ACCOUNT_SECTION_TITLE_CLASS],
            text: "Your ClanSocket account",
            context: null,
            meta: null,
        }),
        div({ classes: [CARD_GRID_CLASS], context: null, meta: null }, [
            wrapAsCard(buildIdentityPanel()),
            wrapAsCard(buildLinkedAccountsPanel()),
            wrapAsCard(buildDevicesPanel()),
            wrapAsCard(buildBackupCodesPanel()),
            wrapAsCard(buildVaultPanel()),
            wrapAsCard(buildLegacyRsnPanel()),
            wrapAsCard(buildDataRightsPanel()),
            wrapAsCard(buildConsentPanel()),
        ]),
    ]).el;
}
