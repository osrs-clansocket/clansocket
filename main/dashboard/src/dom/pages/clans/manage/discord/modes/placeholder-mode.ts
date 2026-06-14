import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { panel, paragraph, type Instance } from "../../../../../factory";
import { DISCORD_PLACEHOLDER_HINT_CLASS } from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";

const HINT_SUFFIX = ": Coming in the resource-editor phase.";

export function buildPlaceholderMode(label: string): Instance {
    return panel({ context: null, meta: null }, [
        paragraph({
            classes: [DISCORD_PLACEHOLDER_HINT_CLASS],
            text: `${label}${HINT_SUFFIX}`,
            context: null,
            meta: null,
        }),
    ]);
}
