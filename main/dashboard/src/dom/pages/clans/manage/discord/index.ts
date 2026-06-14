import "../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { div, effect, paragraph, type Instance } from "../../../../factory";
import { discordServersStoreFor } from "../../../../../state/discord/servers-store.js";
import type { DiscordServer } from "../../../../../state/discord/client.js";
import {
    DISCORD_FRAME_CLASS,
    DISCORD_LOADING_CLASS,
    DISCORD_ROOT_CLASS,
} from "../../../../../shared/constants/clan-manage-discord/route-constants.js";
import { buildEmptyInstall } from "./frame/empty-install.js";
import { buildFooter } from "./frame/footer.js";
import { buildHeader } from "./frame/header.js";
import { buildPaneCenter } from "./frame/pane-center.js";
import { buildRailLeft } from "./frame/rail-left.js";
import { buildRailRight } from "./frame/rail-right.js";
import { type ModeContext, modeContent } from "./mode-registry.js";

const LOADING_TEXT = "Loading discord…";
const DEFAULT_MODE_KEY = "server";

function buildLoading(): Instance {
    return paragraph({
        classes: [DISCORD_LOADING_CLASS],
        text: LOADING_TEXT,
        context: null,
        meta: null,
    });
}

function buildFrame(slug: string, servers: readonly DiscordServer[]): Instance {
    const primary = servers[0]!;
    const ctx: ModeContext = { slug, server: primary, servers };
    const paneCenter = buildPaneCenter();
    const labelOverrides = servers.length > 1 ? { server: "Servers" } : undefined;
    const railLeft = buildRailLeft({
        initialKey: DEFAULT_MODE_KEY,
        onSelect: (key: string) => {
            paneCenter.setMode(modeContent(ctx, key));
        },
        labelOverrides,
    });
    paneCenter.setMode(modeContent(ctx, DEFAULT_MODE_KEY));
    return div({ classes: [DISCORD_FRAME_CLASS], context: null, meta: null }, [
        buildHeader(slug),
        railLeft,
        paneCenter.pane,
        buildRailRight(),
        buildFooter(),
    ]);
}

function renderForState(slug: string, host: Instance, servers: readonly DiscordServer[] | null): void {
    if (servers === null) {
        host.setChildren(buildLoading());
        return;
    }
    if (servers.length === 0) {
        host.setChildren(buildEmptyInstall(slug));
        return;
    }
    host.setChildren(buildFrame(slug, servers));
}

function buildDiscordTab(slug: string): HTMLElement {
    const host = div({ classes: [DISCORD_ROOT_CLASS], context: null, meta: null }, [buildLoading()]);
    const store = discordServersStoreFor(slug);
    void store.ensure();
    effect(() => {
        renderForState(slug, host, store.servers());
    });
    return host.el;
}

export { buildDiscordTab };
