import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import "../../../../../../styles/components/cards/card-grid-component.css";
import "../../../../../../styles/components/cards/surface-card-component.css";
import "../../../../../../styles/components/cards/surface-row-component.css";
import { button, div, panelTitle, span, type Instance } from "../../../../../factory";
import { glassConfirm } from "../../../../../forms/glass/modals/glass-confirm.js";
import { removeDiscordServer, type DiscordServer } from "../../../../../../state/discord/client.js";
import {
    CARD_GRID_AUTO_CLASS,
    CARD_GRID_CLASS,
    SURFACE_CARD_AUTO_CLASS,
    SURFACE_CARD_CLASS,
    SURFACE_ROW_CLASS,
    SURFACE_ROW_META_CLASS,
    SURFACE_ROW_PRIMARY_CLASS,
} from "../../../../../../shared/constants/card-component-constants.js";

const DATETIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
});

const REMOVE_LABEL = "Remove";
const CONFIRM_TITLE = "Remove discord server";
const CONFIRM_BUTTON_LABEL = "Remove";

interface RowDef {
    label: string;
    value: (server: DiscordServer) => string;
}

function formatInstalled(server: DiscordServer): string {
    return `${DATETIME_FORMATTER.format(new Date(server.installed_at))} UTC`;
}

const ROW_DEFS: ReadonlyArray<RowDef> = [
    { label: "Guild", value: (s) => s.guild_name },
    { label: "Guild ID", value: (s) => s.guild_id },
    { label: "Installed", value: formatInstalled },
];

function buildRow(def: RowDef, server: DiscordServer): Instance {
    return div({ classes: [SURFACE_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [SURFACE_ROW_PRIMARY_CLASS], text: def.label, context: null, meta: null }),
        span({ classes: [SURFACE_ROW_META_CLASS], text: def.value(server), context: null, meta: null }),
    ]);
}

async function confirmAndRemove(slug: string, server: DiscordServer): Promise<void> {
    const confirmed = await glassConfirm({
        title: CONFIRM_TITLE,
        message: `The ClanSocket bot will leave ${server.guild_name}. This cannot be undone from here.`,
        confirmLabel: CONFIRM_BUTTON_LABEL,
        danger: true,
    });
    if (!confirmed) return;
    await removeDiscordServer(slug, server.guild_id);
}

function buildRemoveButton(slug: string, server: DiscordServer): Instance {
    return button({
        variant: "outline",
        compact: true,
        text: REMOVE_LABEL,
        context: `remove the ClanSocket bot from ${server.guild_name}`,
        meta: ["action"],
        onClick: () => {
            void confirmAndRemove(slug, server);
        },
    });
}

function buildServerSection(slug: string, server: DiscordServer): Instance {
    return div({ classes: [SURFACE_CARD_CLASS, SURFACE_CARD_AUTO_CLASS], context: null, meta: null }, [
        panelTitle({ text: server.guild_name, context: null, meta: null }),
        ...ROW_DEFS.map((def) => buildRow(def, server)),
        buildRemoveButton(slug, server),
    ]);
}

export function buildServerMode(slug: string, servers: readonly DiscordServer[]): Instance {
    return div(
        { classes: [CARD_GRID_CLASS, CARD_GRID_AUTO_CLASS], context: null, meta: null },
        servers.map((server) => buildServerSection(slug, server)),
    );
}
