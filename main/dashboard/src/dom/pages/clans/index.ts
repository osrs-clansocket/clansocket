import "../../../styles/pages/clans/home/index.css";
import "../../../styles/pages/clans/clan-manage-page.css";
import "../../../styles/pages/clans/clan-missing-page.css";
import "../../../styles/pages/clans/clan-plugin-page.css";
import "../../../styles/pages/clans/clan-roster-page.css";
import "../../../styles/pages/clans/clan-section-page.css";
import "../../../styles/pages/clans/clan-status-page.css";
import "../../../styles/pages/clans/clan-view-page.css";
import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    heading,
    icon,
    onceEffect,
    paragraph,
    span,
    type Instance,
} from "../../factory";
import { clansClient, type ManagedClan } from "../../../state/clans/clans-client/index.js";
import { clansStore } from "../../../state/clans/stores/clans-store.js";
import { memberClansStore } from "../../../state/clans/stores/member-clans-store.js";
import { clanSlugFromPath, router } from "../../../managers/router";
import { fetchClanRankLadder, type ClanRankLadder } from "../../../state/icons/rank-sort.js";
import {
    persistSort,
    persistView,
    readSort,
    readView,
    type RosterSort,
    type RosterView,
} from "../../../state/clans/roster/prefs.js";
import { buildRosterGrid, buildRosterList } from "./roster-items.js";
import { applySort, buildSortToggle, buildViewToggle } from "./toggles.js";
import {
    CLAN_HEADING_CLASS,
    CLAN_MANAGE_BTN_CLASS,
    CLAN_MISSING_CLASS,
    CLAN_NAME_CLASS,
    CLAN_ROSTER_CONTROLS_CLASS,
    CLAN_ROSTER_COUNT_CLASS,
    CLAN_ROSTER_EMPTY_CLASS,
    CLAN_ROSTER_TITLE_GROUP_CLASS,
    CLAN_ROSTER_TOOLBAR_CLASS,
    CLAN_SECTION_TITLE_CLASS,
    CLAN_STATUS_CLASS,
} from "../../../shared/constants/clan-page-constants.js";
import { ROUTE_CLAN_CLASS, ROUTE_ROOT_CLASS } from "../../../shared/constants/route-constants.js";

function buildMissing(): HTMLElement {
    return div(
        {
            classes: [ROUTE_ROOT_CLASS, ROUTE_CLAN_CLASS],
            effects: onceEffect("route-enter-right"),
            context: null,
            meta: null,
        },
        [paragraph({ classes: [CLAN_MISSING_CLASS], text: "Clan not found.", context: null, meta: null })],
    ).el;
}

function buildManageBtn(slug: string): Instance {
    return button(
        {
            variant: BTN_VARIANT_OUTLINE,
            classes: [CLAN_MANAGE_BTN_CLASS],
            ariaLabel: "Manage clan",
            title: "Manage clan",
            context: "open this clan's management page",
            meta: ["nav", "clan"],
            onClick: () => {
                router.navigate(`/clans/${slug}/manage`);
            },
        },
        [icon({ name: "gear-fill", context: null, meta: null })],
    );
}

function buildMapBtn(slug: string): Instance {
    return button(
        {
            variant: BTN_VARIANT_OUTLINE,
            classes: [CLAN_MANAGE_BTN_CLASS],
            ariaLabel: "Open clan map",
            title: "Open clan map",
            context: "open the live clan-positions map for this clan",
            meta: ["nav", "clan"],
            onClick: () => {
                router.navigate(`/clans/${slug}/live`);
            },
        },
        [icon({ name: "geo-alt-fill", context: null, meta: null })],
    );
}

function buildLoaded(clan: ManagedClan, isManager: boolean, ladder: ClanRankLadder): HTMLElement {
    const members = clan.roster?.members ?? [];
    let currentView = readView();
    let currentSort = readSort();
    const host = div({ context: null, meta: null });
    const renderRoster = (): void => {
        if (members.length === 0) {
            host.setChildren(
                paragraph({
                    classes: [CLAN_ROSTER_EMPTY_CLASS],
                    text: "Awaiting roster..",
                    context: null,
                    meta: null,
                }),
            );
            return;
        }
        const sorted = applySort(members, currentSort, ladder);
        host.setChildren(currentView === "grid" ? buildRosterGrid(sorted) : buildRosterList(sorted));
    };
    renderRoster();
    const onViewChange = (v: RosterView): void => {
        currentView = v;
        persistView(v);
        renderRoster();
    };
    const onSortChange = (v: RosterSort): void => {
        currentSort = v;
        persistSort(v);
        renderRoster();
    };
    const controlChildren: Instance[] = [];
    controlChildren.push(buildMapBtn(clan.slug));
    if (isManager) controlChildren.push(buildManageBtn(clan.slug));
    controlChildren.push(buildSortToggle(currentSort, onSortChange));
    controlChildren.push(buildViewToggle(currentView, onViewChange));
    const controls = div({ classes: [CLAN_ROSTER_CONTROLS_CLASS], context: null, meta: null }, controlChildren);
    return div(
        {
            classes: [ROUTE_ROOT_CLASS, ROUTE_CLAN_CLASS],
            effects: onceEffect("route-enter-right"),
            context: null,
            meta: null,
        },
        [
            heading("h1", {
                classes: [CLAN_HEADING_CLASS, CLAN_NAME_CLASS],
                text: clan.displayName,
                context: null,
                meta: null,
            }),
            span({ classes: [CLAN_STATUS_CLASS], text: clan.status, context: null, meta: null }),
            div({ classes: [CLAN_ROSTER_TOOLBAR_CLASS], context: null, meta: null }, [
                div({ classes: [CLAN_ROSTER_TITLE_GROUP_CLASS], context: null, meta: null }, [
                    heading("h2", {
                        classes: [CLAN_SECTION_TITLE_CLASS],
                        text: "Roster",
                        context: null,
                        meta: null,
                    }),
                    span({
                        classes: [CLAN_ROSTER_COUNT_CLASS],
                        text: String(members.length),
                        context: null,
                        meta: null,
                    }),
                ]),
                controls,
            ]),
            host,
        ],
    ).el;
}

export async function renderClan(path: string): Promise<HTMLElement> {
    const slug = clanSlugFromPath(path);
    if (slug.length === 0) return buildMissing();
    await Promise.all([clansStore.ready(), memberClansStore.ready()]);
    const managed = clansStore.managed$().find((c) => c.slug === slug);
    const member = memberClansStore.member$().find((c) => c.slug === slug);
    const clan = managed ?? member;
    if (clan === undefined) return buildMissing();
    const [status, ladder] = await Promise.all([
        clansClient.checkClanManagerStatus(slug).catch(() => ({ isManager: false, clanId: null, slug })),
        fetchClanRankLadder(slug).catch(() => [] as ClanRankLadder),
    ]);
    return buildLoaded(clan, status.isManager, ladder);
}
