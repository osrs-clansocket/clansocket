import { paragraph, type Instance } from "../../../factory";
import { CLAN_HOME_INTRO_CLASS } from "../../../../shared/constants/clan-home-constants.js";

export function buildHomeIntro(text: string): Instance {
    return paragraph({
        classes: [CLAN_HOME_INTRO_CLASS],
        text,
        context: null,
        meta: null,
    });
}
