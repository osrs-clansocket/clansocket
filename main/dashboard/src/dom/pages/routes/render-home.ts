import "../../../styles/pages/routes/route-home-page.css";
import "../../../styles/pages/clans/home/index.css";
import { div } from "../../factory";
import { identityClient } from "../../../state/identity/identity-client/index.js";
import { buildHomeIntro } from "../clans/home/index.js";
import { ROUTE_HOME_CLASS } from "../../../shared/constants/route-constants.js";

function buildSignedOut(): HTMLElement {
    return div({ classes: [ROUTE_HOME_CLASS], context: null, meta: null }, [
        buildHomeIntro("Sign in via the header icon to claim + manage your clan.").el,
    ]).el;
}

function buildSignedIn(displayName: string): HTMLElement {
    return div({ classes: [ROUTE_HOME_CLASS], context: null, meta: null }, [
        buildHomeIntro(`Signed in as ${displayName}. Open Profile to manage your clans.`).el,
    ]).el;
}

async function renderHome(): Promise<HTMLElement> {
    const session = await identityClient.session().catch(() => null);
    if (session === null) return buildSignedOut();
    return buildSignedIn(session.displayName ?? "you");
}

export { renderHome };
