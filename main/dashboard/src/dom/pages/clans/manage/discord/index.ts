import "../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import { div, effect, paragraph, signal, type Instance } from "../../../../factory";
import { discordServersStoreFor } from "../../../../../state/discord/servers-store.js";
import { clearSelectedDiscordItem } from "../../../../../state/discord/selected-item.js";
import { inspectorOverride$ } from "../../../../../state/discord/inspector-override.js";
import { clearPreviewState } from "./modes/auto-hooks/preview/preview-state.js";
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
import { modeContent } from "./mode-registry.js";

const LOADING_TEXT = "Loading discord…";
const DEFAULT_MODE_KEY = "channels";

function buildLoading(): Instance {
    return paragraph({
        classes: [DISCORD_LOADING_CLASS],
        text: LOADING_TEXT,
        context: null,
        meta: null,
    });
}

function resolveServer(servers: readonly DiscordServer[], guildId: string): DiscordServer {
    return servers.find((s) => s.guild_id === guildId) ?? servers[0]!;
}

function buildFrame(slug: string, servers: readonly DiscordServer[], subTab: string): Instance {
    // initialServer captured as a plain variable. Reading selectedGuildId()
    // during synchronous frame construction would register the signal as a
    // dep of the outer buildDiscordTab effect and rebuild the whole frame on
    // every server switch (architectural lesson #1 in SESSION-DECISIONS-2026-06-14.md).
    const initialServer = servers[0]!;
    const selectedGuildId = signal<string>(initialServer.guild_id);
    const paneCenter = buildPaneCenter();

    const renderModeFor = (guildId: string): void => {
        const server = resolveServer(servers, guildId);
        paneCenter.setMode(modeContent({ slug, server, servers }, subTab));
    };

    const railLeft = buildRailLeft({ slug, activeKey: subTab });

    const header = buildHeader({
        slug,
        servers,
        activeGuildId: () => selectedGuildId(),
        onSelect: (guildId: string) => {
            if (guildId === selectedGuildId()) return;
            selectedGuildId.set(guildId);
            clearSelectedDiscordItem();
            renderModeFor(guildId);
        },
    });

    paneCenter.setMode(modeContent({ slug, server: initialServer, servers }, subTab));

    return div({ classes: [DISCORD_FRAME_CLASS], context: null, meta: null }, [
        header,
        railLeft,
        paneCenter.pane,
        buildRailRight(),
        buildFooter(),
    ]);
}

function renderForState(slug: string, host: Instance, servers: readonly DiscordServer[] | null, subTab: string): void {
    if (servers === null) {
        host.setChildren(buildLoading());
        return;
    }
    if (servers.length === 0) {
        host.setChildren(buildEmptyInstall(slug));
        return;
    }
    host.setChildren(buildFrame(slug, servers, subTab));
}

function buildDiscordTab(slug: string, subTab?: string | null): HTMLElement {
    inspectorOverride$.set(null);
    clearPreviewState();
    const host = div({ classes: [DISCORD_ROOT_CLASS], context: null, meta: null }, [buildLoading()]);
    const store = discordServersStoreFor(slug);
    void store.ensure();
    const mode = subTab ?? DEFAULT_MODE_KEY;
    effect(() => {
        renderForState(slug, host, store.servers(), mode);
    });
    return host.el;
}

export { buildDiscordTab };
