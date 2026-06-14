import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { anchor, div, type Instance } from "../../../../../factory";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import { DISCORD_HEADER_CLASS } from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";
import { TOOLBAR_CHIP_CLASS, TOOLBAR_CLASS } from "../../../../../../shared/constants/toolbar-component-constants.js";

const INSTALL_LABEL = "Add a server";
const INSTALL_CONTEXT = "install the ClanSocket bot to connect another discord server.";

function buildInstallChip(slug: string): Instance {
    return anchor({
        href: `/api/auth/site/discord-bot-install/start?slug=${encodeURIComponent(slug)}`,
        text: INSTALL_LABEL,
        classes: [TOOLBAR_CHIP_CLASS],
        context: INSTALL_CONTEXT,
        meta: ["action", "nav"],
    });
}

export function buildHeader(slug: string): Instance {
    return div({ classes: [GLASS_PANE_CLASS, DISCORD_HEADER_CLASS], context: null, meta: null }, [
        div({ classes: [TOOLBAR_CLASS], context: null, meta: null }, [buildInstallChip(slug)]),
    ]);
}
