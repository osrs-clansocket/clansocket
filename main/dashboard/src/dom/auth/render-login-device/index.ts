import { div, heading, paragraph } from "../../factory";
import { buildRecoverLink, buildSigninCard } from "./signin-card.js";
import {
    ACCOUNT_SECTION_HINT_CLASS,
    ACCOUNT_SECTION_TITLE_CLASS,
} from "../../../shared/constants/account-constants.js";
import { ROUTE_ACCOUNT_CLASS, ROUTE_ROOT_CLASS } from "../../../shared/constants/route-constants.js";

export async function renderLoginDevice(): Promise<HTMLElement> {
    const fallbackHost = div({ context: null, meta: null });
    return div({ classes: [ROUTE_ROOT_CLASS, ROUTE_ACCOUNT_CLASS], context: null, meta: null }, [
        heading("h2", {
            classes: [ACCOUNT_SECTION_TITLE_CLASS],
            text: "Sign in with device",
            context: null,
            meta: null,
        }),
        paragraph({
            classes: [ACCOUNT_SECTION_HINT_CLASS],
            text: "Passkeys are stored on this device (biometric / PIN / security key). No email needed.",
            context: null,
            meta: null,
        }),
        buildSigninCard(fallbackHost),
        fallbackHost,
        buildRecoverLink(),
    ]).el;
}
