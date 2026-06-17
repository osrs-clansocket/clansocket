import "../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { anchor, button, div, effect, type Instance } from "../../../../../factory";
import { GLASS_PANE_CLASS } from "../../../../../../shared/constants/glass-constants.js";
import { DISCORD_HEADER_CLASS } from "../../../../../../shared/constants/clan-manage-discord/route-constants.js";
import {
    TOOLBAR_CHIP_ACTIVE_CLASS,
    TOOLBAR_CHIP_CLASS,
    TOOLBAR_CLASS,
} from "../../../../../../shared/constants/toolbar-component-constants.js";
import type { DiscordServer } from "../../../../../../state/discord/client.js";

const INSTALL_LABEL = "Add a server";
const INSTALL_CONTEXT = "install the ClanSocket bot to connect another discord server.";

export interface BuildHeaderOptions {
    slug: string;
    servers: readonly DiscordServer[];
    activeGuildId: () => string;
    onSelect: (guildId: string) => void;
}

function buildInstallChip(slug: string): Instance {
    return anchor({
        href: `/api/auth/site/discord-bot-install/start?slug=${encodeURIComponent(slug)}`,
        text: INSTALL_LABEL,
        classes: [TOOLBAR_CHIP_CLASS],
        context: INSTALL_CONTEXT,
        meta: ["action", "nav"],
    });
}

function botLabelFor(server: DiscordServer): string {
    return server.bot_name !== null && server.bot_name.length > 0 ? server.bot_name : server.bot_id;
}

function buildServerChip(server: DiscordServer, onSelect: (guildId: string) => void): Instance {
    return button({
        classes: [TOOLBAR_CHIP_CLASS],
        text: server.guild_name,
        title: `Served by ${botLabelFor(server)}`,
        context: `switch the discord management surface to ${server.guild_name}`,
        meta: ["action", "nav"],
        onClick: () => onSelect(server.guild_id),
    });
}

export function buildHeader(opts: BuildHeaderOptions): Instance {
    const chipByGuildId = new Map<string, Instance>();
    const serverChips: Instance[] = opts.servers.map((server) => {
        const chip = buildServerChip(server, opts.onSelect);
        chipByGuildId.set(server.guild_id, chip);
        return chip;
    });

    // Inner effect tracks selectedGuildId inside its own reactive scope so the
    // outer buildDiscordTab effect never sees the signal as a dep. Reading
    // opts.activeGuildId() during synchronous header construction would leak
    // the dep upward and rebuild the whole frame on every server switch
    // (architectural lesson #1 in SESSION-DECISIONS-2026-06-14.md).
    effect(() => {
        const current = opts.activeGuildId();
        for (const [guildId, chip] of chipByGuildId) {
            chip.toggleClass(TOOLBAR_CHIP_ACTIVE_CLASS, guildId === current);
        }
    });

    return div({ classes: [GLASS_PANE_CLASS, DISCORD_HEADER_CLASS], context: null, meta: null }, [
        div({ classes: [TOOLBAR_CLASS], context: null, meta: null }, [...serverChips, buildInstallChip(opts.slug)]),
    ]);
}
