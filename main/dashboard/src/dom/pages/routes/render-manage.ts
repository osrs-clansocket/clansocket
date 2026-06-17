import "../../../styles/pages/clans/manage/index.css";
import "../../../styles/pages/clans/clan-manage-page.css";
import "../../../styles/pages/routes/route-clan-manage-page.css";
import { BTN_VARIANT_OUTLINE, button, div, paragraph, type Instance } from "../../factory";
import { clanSlugFromManagePath, manageSubTabFromPath, manageTabFromPath, router } from "../../../managers/router";
import { clansStore } from "../../../state/clans/stores/clans-store.js";
import { TAB_KEYS, buildTab, resolveTabKey } from "../clans/manage";
import {
    CLAN_MANAGE_BACK_CLASS,
    CLAN_MANAGE_BODY_CLASS,
    CLAN_MANAGE_MISSING_CLASS,
    CLAN_MANAGE_TAB_ACTIVE_CLASS,
    CLAN_MANAGE_TAB_CLASS,
    CLAN_MANAGE_TABS_CLASS,
} from "../../../shared/constants/clan-manage-route-constants.js";
import { ROUTE_CLAN_MANAGE_CLASS } from "../../../shared/constants/route-constants.js";

function buildMissing(): HTMLElement {
    return div({ classes: [ROUTE_CLAN_MANAGE_CLASS], context: null, meta: null }, [
        paragraph({ classes: [CLAN_MANAGE_MISSING_CLASS], text: "Clan not found.", context: null, meta: null }),
    ]).el;
}

function buildTabButton(slug: string, key: string, isActive: boolean): Instance {
    const label = key.split("-").join(" ");
    const btn = button({
        classes: [CLAN_MANAGE_TAB_CLASS, ...(isActive ? [CLAN_MANAGE_TAB_ACTIVE_CLASS] : [])],
        role: "tab",
        ariaSelected: isActive ? "true" : "false",
        data: { "tab-key": key },
        text: label,
        context: `switch to the ${label} management tab`,
        meta: ["nav"],
        onClick: () => {
            router.navigate(`/clans/${slug}/manage/${key}`);
        },
    });
    return btn;
}

function buildBackButton(slug: string): Instance {
    const back = button({
        classes: [CLAN_MANAGE_BACK_CLASS],
        variant: BTN_VARIANT_OUTLINE,
        text: "Back to clan",
        ariaLabel: "Back to clan page",
        context: "go back to the clan page",
        meta: ["nav", "clan"],
        onClick: () => {
            router.navigate(`/clans/${slug}`);
        },
    });
    return back;
}

function buildTabNav(slug: string, active: string): Instance {
    return div({ classes: [CLAN_MANAGE_TABS_CLASS], role: "tablist", context: null, meta: null }, [
        ...TAB_KEYS.map((key) => buildTabButton(slug, key, key === active)),
        buildBackButton(slug),
    ]);
}

async function renderClanManage(path: string): Promise<HTMLElement> {
    const slug = clanSlugFromManagePath(path);
    if (slug.length === 0) return buildMissing();
    await clansStore.ready();
    if (clansStore.managed$().find((c) => c.slug === slug) === undefined) return buildMissing();

    const activeTab = resolveTabKey(manageTabFromPath(path));
    const activeSubTab = manageSubTabFromPath(path);

    const tabBody = div(
        { classes: [CLAN_MANAGE_BODY_CLASS], data: { "active-tab": activeTab }, context: null, meta: null },
        [buildTab(activeTab, slug, activeSubTab)],
    );

    return div({ classes: [ROUTE_CLAN_MANAGE_CLASS], context: null, meta: null }, [
        buildTabNav(slug, activeTab),
        tabBody,
    ]).el;
}

export { renderClanManage };
