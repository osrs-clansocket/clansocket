import "../../../styles/pages/routes/route-legal-page.css";
import { anchor, div, heading, paragraph, type Instance } from "../../factory";
import {
    ROUTE_LEGAL_BACK_CLASS,
    ROUTE_LEGAL_BODY_CLASS,
    ROUTE_LEGAL_CLASS,
    ROUTE_LEGAL_TITLE_CLASS,
} from "../../../shared/constants/route-constants.js";

const BODY_TEXT = "terms of service placeholder. real content lands here once the legal text is written.";

function buildBackLink(): Instance {
    return anchor({
        href: "/",
        data: { route: "" },
        classes: [ROUTE_LEGAL_BACK_CLASS],
        text: "← Back to home",
        context: "return to the home page",
        meta: ["nav"],
    });
}

async function renderTerms(): Promise<HTMLElement> {
    return div({ classes: [ROUTE_LEGAL_CLASS], context: null, meta: null }, [
        heading("h1", {
            classes: [ROUTE_LEGAL_TITLE_CLASS],
            text: "Terms of Service",
            context: null,
            meta: null,
        }),
        paragraph({
            classes: [ROUTE_LEGAL_BODY_CLASS],
            text: BODY_TEXT,
            context: null,
            meta: null,
        }),
        buildBackLink(),
    ]).el;
}

export { renderTerms };
