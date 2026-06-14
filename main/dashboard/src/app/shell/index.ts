import { div, mainEl } from "../../dom/factory";
import { buildAiBar, SHELL_AI_CLASS } from "./ai-bar.js";
import { buildHeader } from "../../dom/pages/dashboard/header.js";
import { ERROR_BANNER_HOST_CLASS } from "../../shared/constants/error-banner-constants.js";

const SHELL_CLASS = "app-public";
const ROUTE_HOST_CLASS = "route-host";

interface ShellFrame {
    shell: HTMLElement;
    routeRoot: HTMLElement;
}

async function initBgfx(): Promise<void> {
    const mod = await import("../../dom/background");
    mod.initBackground();
}

async function initAi(wrapper: HTMLElement): Promise<void> {
    const aiBar = wrapper.querySelector<HTMLElement>(`.${SHELL_AI_CLASS}`);
    if (aiBar === null) return;
    const mod = await import("../../dom/ai/panel");
    mod.mountAiPanel(aiBar).show();
}

function mountShell(): ShellFrame {
    const headerEl = buildHeader();
    const bannerHostEl = div({ classes: [ERROR_BANNER_HOST_CLASS], context: null, meta: null }).el;
    const aiPanelEl = buildAiBar();
    const routeRoot = div({ classes: [ROUTE_HOST_CLASS], context: null, meta: null }).el;
    const shell = mainEl({ classes: [SHELL_CLASS], context: null, meta: null }, [
        headerEl,
        bannerHostEl,
        routeRoot,
        aiPanelEl,
    ]).el;
    return { shell, routeRoot };
}

export { mountShell, initBgfx, initAi };
export type { ShellFrame };
