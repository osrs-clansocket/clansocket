import "../../../styles/pages/clans/clan-map-page.css";
import "../../../styles/pages/clans/clan-map-page-mobile.css";
import {
    BTN_VARIANT_BARE,
    button,
    div,
    effect,
    heading,
    icon,
    iconLabel,
    ICON_LABEL_SIZE_SM,
    image,
    paragraph,
    rsnTag,
    span,
    type Instance,
    type LiveChange,
    type LiveStore,
    type ReadSignal,
} from "../../factory";
import { clanMap, type ClanMapApi } from "../../clans/clan-map/index.js";
import { clanSlugFromLivePath } from "../../../managers/router/slug-paths.js";
import { events } from "../../../managers/events";
import { combatLines, prayerSpriteSrc } from "../../clans/clan-map/names.js";
import {
    createPositionsStore,
    isPositionActive,
    type PositionRow,
    type PositionsState,
    type PositionsStore,
} from "../../../state/clans/stores/positions-store.js";
import {
    CLAN_MAP_EMPTY_CLASS,
    CLAN_MAP_HOST_CLASS,
    CLAN_MAP_LABEL_LIST_CLASS,
    CLAN_MAP_LABEL_REGION_CLASS,
    CLAN_MAP_LABEL_ROW_CLASS,
    CLAN_MAP_ROUTE_CLASS,
    CLAN_MAP_ROW_ACTION_CLASS,
    CLAN_MAP_ROW_ACTION_ICON_CLASS,
    CLAN_MAP_ROW_ACTIONS_CLASS,
    CLAN_MAP_ROW_ALERT_CLASS,
    CLAN_MAP_ROW_BAND_CLASS,
    CLAN_MAP_ROW_COMBAT_CLASS,
    CLAN_MAP_ROW_COMBAT_DMG_CLASS,
    CLAN_MAP_ROW_COMBAT_ENTRY_CLASS,
    CLAN_MAP_ROW_COMBAT_NAME_CLASS,
    CLAN_MAP_ROW_CONTENT_CLASS,
    CLAN_MAP_ROW_FOLLOW_CLASS,
    CLAN_MAP_ROW_MAIN_CLASS,
    CLAN_MAP_ROW_META_CLASS,
    CLAN_MAP_ROW_META_GROUP_CLASS,
    CLAN_MAP_ROW_PRAYER_ICON_CLASS,
    CLAN_MAP_ROW_PRAYERS_CLASS,
    CLAN_MAP_ROW_RAIL_CLASS,
    CLAN_MAP_ROW_STAT_CLASS,
    CLAN_MAP_ROW_STAT_VALUE_CLASS,
    CLAN_MAP_ROW_STATS_CLASS,
    CLAN_MAP_ROW_TOP_CLASS,
    CLAN_MAP_ROW_UPPER_CLASS,
    CLAN_MAP_SIDE_CLASS,
    CLAN_MAP_SIDE_COUNT_CLASS,
    CLAN_MAP_SIDE_EMPTY_CLASS,
    CLAN_MAP_SIDE_HEADER_CLASS,
    CLAN_MAP_SIDE_SECTION_CLASS,
    CLAN_MAP_SIDE_TITLE_CLASS,
} from "../../../shared/constants/clan-map-constants.js";
import { ROUTE_ROOT_CLASS } from "../../../shared/constants/route-constants.js";
import { IS_CLICKABLE_CLASS } from "../../../shared/constants/state-modifier-constants.js";

function renderEmpty(slug: string): HTMLElement {
    return div({ classes: [ROUTE_ROOT_CLASS, CLAN_MAP_ROUTE_CLASS], context: null, meta: null }, [
        paragraph({
            classes: [CLAN_MAP_EMPTY_CLASS],
            text: `No live positions yet for ${slug}. Have a clan member open the plugin in-game.`,
            context: null,
            meta: null,
        }),
    ]).el;
}

interface RowHandlers {
    onFocus: (hash: string) => void;
    onToggleFollow: (hash: string) => void;
    onToggleAlert: (hash: string) => void;
    followedHash$: ReadSignal<string | null>;
    alertedHashes$: ReadSignal<ReadonlySet<string>>;
}

interface RowActionOpts {
    classes: string[];
    iconName: string;
    activeIconName: string;
    isActive$: () => boolean;
    label: string;
    onToggle: () => void;
}

function buildRowAction({ classes, iconName, activeIconName, isActive$, label, onToggle }: RowActionOpts): Instance {
    const inactiveIcon = icon({ name: iconName, ariaHidden: true, context: null, meta: null });
    const activeIcon = icon({ name: activeIconName, ariaHidden: true, context: null, meta: null });
    const iconHost = span({ classes: [CLAN_MAP_ROW_ACTION_ICON_CLASS], context: null, meta: null }, [
        inactiveIcon,
        activeIcon,
    ]);
    const btn = button(
        {
            ariaLabel: label,
            variant: BTN_VARIANT_BARE,
            classes,
            context: label,
            meta: ["action", "clan"],
            onClick: (e: MouseEvent) => {
                e.stopPropagation();
                onToggle();
            },
        },
        [iconHost],
    );
    const dispose = effect(() => {
        const active = isActive$();
        btn.el.classList.toggle("is-active", active);
        inactiveIcon.el.style.display = active ? "none" : "";
        activeIcon.el.style.display = active ? "" : "none";
    });
    btn.trackDispose(dispose);
    return btn;
}

const BLIP_COLOR = "#ff5252";
const HP_ICON_NAME = "osrs-sprite_skill_hitpoints";
const PRAYER_ICON_NAME = "osrs-sprite_skill_prayer";
const ATTACK_ICON_NAME = "osrs-hiscores_attack";

function buildBlipRail(): Instance {
    const rail = div({ classes: [CLAN_MAP_ROW_RAIL_CLASS], context: null, meta: null });
    rail.el.style.background = BLIP_COLOR;
    return rail;
}

interface RowRefs {
    instance: Instance;
    rsnTagInst: Instance;
    topLine: Instance;
    regionInst: Instance;
    hpInst: Instance;
    prayerInst: Instance;
    worldInst: Instance;
    activityInst: Instance;
    metaGroup: Instance;
    prayersInst: Instance;
    prayerImgs: Map<string, Instance>;
    band: Instance;
    combatInst: Instance;
    combatIcon: Instance;
    combatNameInst: Instance;
    combatDmgInst: Instance;
    currentRsn: string;
}

function buildRowShell(row: PositionRow, h: RowHandlers): RowRefs {
    const hpPair = iconLabel({
        name: HP_ICON_NAME,
        alt: "HP",
        size: ICON_LABEL_SIZE_SM,
        classes: [CLAN_MAP_ROW_STAT_CLASS],
        labelClasses: [CLAN_MAP_ROW_STAT_VALUE_CLASS],
        context: null,
        meta: null,
    });
    const prayerPair = iconLabel({
        name: PRAYER_ICON_NAME,
        alt: "Prayer",
        size: ICON_LABEL_SIZE_SM,
        classes: [CLAN_MAP_ROW_STAT_CLASS],
        labelClasses: [CLAN_MAP_ROW_STAT_VALUE_CLASS],
        context: null,
        meta: null,
    });
    const worldInst = span({ classes: [CLAN_MAP_ROW_META_CLASS], context: null, meta: null });
    const activityInst = span({ classes: [CLAN_MAP_ROW_META_CLASS], context: null, meta: null });
    const prayersInst = div({ classes: [CLAN_MAP_ROW_PRAYERS_CLASS], context: null, meta: null });
    const metaGroup = div({ classes: [CLAN_MAP_ROW_META_GROUP_CLASS], context: null, meta: null }, [
        worldInst,
        activityInst,
    ]);
    const statsRow = div({ classes: [CLAN_MAP_ROW_STATS_CLASS], context: null, meta: null }, [
        hpPair.instance,
        prayerPair.instance,
        metaGroup,
    ]);
    const regionInst = span({ classes: [CLAN_MAP_LABEL_REGION_CLASS], context: null, meta: null });
    const rsnTagInst = rsnTag({ rsn: row.latest_rsn, context: null, meta: null });
    const topLine = div({ classes: [CLAN_MAP_ROW_TOP_CLASS], context: null, meta: null }, [rsnTagInst, regionInst]);
    const main = div({ classes: [CLAN_MAP_ROW_MAIN_CLASS], context: null, meta: null }, [topLine, statsRow]);
    const followBtn = buildRowAction({
        classes: [CLAN_MAP_ROW_ACTION_CLASS, CLAN_MAP_ROW_FOLLOW_CLASS],
        iconName: "crosshair",
        activeIconName: "crosshair2",
        isActive$: () => h.followedHash$() === row.account_hash,
        label: `follow ${row.latest_rsn}`,
        onToggle: () => h.onToggleFollow(row.account_hash),
    });
    const alertBtn = buildRowAction({
        classes: [CLAN_MAP_ROW_ACTION_CLASS, CLAN_MAP_ROW_ALERT_CLASS],
        iconName: "bell",
        activeIconName: "bell-fill",
        isActive$: () => h.alertedHashes$().has(row.account_hash),
        label: `alert on ${row.latest_rsn}`,
        onToggle: () => h.onToggleAlert(row.account_hash),
    });
    const actions = div({ classes: [CLAN_MAP_ROW_ACTIONS_CLASS], context: null, meta: null }, [alertBtn, followBtn]);
    const upper = div({ classes: [CLAN_MAP_ROW_UPPER_CLASS], context: null, meta: null }, [main, actions]);
    const combatDmgInst = span({ classes: [CLAN_MAP_ROW_COMBAT_DMG_CLASS], context: null, meta: null });
    combatDmgInst.el.style.color = BLIP_COLOR;
    const combatPair = iconLabel({
        name: ATTACK_ICON_NAME,
        alt: "attack",
        size: ICON_LABEL_SIZE_SM,
        classes: [CLAN_MAP_ROW_COMBAT_ENTRY_CLASS],
        labelClasses: [CLAN_MAP_ROW_COMBAT_NAME_CLASS],
        trailing: combatDmgInst,
        context: null,
        meta: null,
    });
    const combatInst = div({ classes: [CLAN_MAP_ROW_COMBAT_CLASS], context: null, meta: null }, [combatPair.instance]);
    const band = div({ classes: [CLAN_MAP_ROW_BAND_CLASS], context: null, meta: null }, [prayersInst, combatInst]);
    const content = div({ classes: [CLAN_MAP_ROW_CONTENT_CLASS], context: null, meta: null }, [upper, band]);
    const instance = div(
        {
            classes: [CLAN_MAP_LABEL_ROW_CLASS, IS_CLICKABLE_CLASS],
            context: `focus on ${row.latest_rsn}`,
            meta: null,
            onClick: () => {
                const currentFollow = h.followedHash$();
                if (currentFollow === row.account_hash) return;
                if (currentFollow !== null) h.onToggleFollow(row.account_hash);
                else h.onFocus(row.account_hash);
            },
        },
        [buildBlipRail(), content],
    );
    const refs: RowRefs = {
        instance,
        rsnTagInst,
        topLine,
        regionInst,
        hpInst: hpPair.labelInst,
        prayerInst: prayerPair.labelInst,
        worldInst,
        activityInst,
        metaGroup,
        prayersInst,
        prayerImgs: new Map<string, Instance>(),
        band,
        combatInst,
        combatIcon: combatPair.iconInst,
        combatNameInst: combatPair.labelInst,
        combatDmgInst,
        currentRsn: row.latest_rsn,
    };
    patchRow(refs, row);
    return refs;
}

function patchRow(refs: RowRefs, row: PositionRow): void {
    if (row.latest_rsn !== refs.currentRsn) {
        refs.currentRsn = row.latest_rsn;
        const newTag = rsnTag({ rsn: row.latest_rsn, context: null, meta: null });
        refs.rsnTagInst.destroy();
        refs.topLine.addFirst(newTag);
        refs.rsnTagInst = newTag;
    }
    refs.regionInst.setText(row.location_region_name || "—");
    refs.hpInst.setText(`${row.hitpoints}/${row.max_hitpoints}`);
    refs.prayerInst.setText(`${row.prayer}/${row.max_prayer}`);
    const showWorld = row.world !== null;
    refs.worldInst.el.style.display = showWorld ? "" : "none";
    if (showWorld) refs.worldInst.setText(`W${row.world}`);
    const activity = row.activity;
    const showActivity = activity !== null && activity.length > 0;
    refs.activityInst.el.style.display = showActivity ? "" : "none";
    if (showActivity) refs.activityInst.setText(activity);
    refs.metaGroup.el.style.display = showWorld || showActivity ? "" : "none";
    syncRowPrayerImages(refs, row.active_prayers);
    const lines = combatLines(row, Date.now());
    const line = lines.length > 0 ? lines[0] : null;
    if (line !== null) {
        refs.combatNameInst.setText(line.target);
        const hasDmg = line.dealt !== null;
        if (hasDmg) refs.combatDmgInst.setText(`−${line.dealt ?? 0}`);
        else refs.combatDmgInst.setText("");
        refs.combatDmgInst.el.style.display = hasDmg ? "" : "none";
        refs.combatIcon.el.style.display = hasDmg ? "" : "none";
        refs.combatInst.el.style.display = "";
    } else {
        refs.combatInst.el.style.display = "none";
    }
    const hasPrayers = row.active_prayers.length > 0;
    refs.band.el.style.display = hasPrayers || line !== null ? "" : "none";
}

function syncRowPrayerImages(refs: RowRefs, active: readonly string[]): void {
    const wanted = new Set(active);
    for (const [name, inst] of refs.prayerImgs) {
        if (!wanted.has(name)) {
            inst.detach();
            refs.prayerImgs.delete(name);
        }
    }
    for (const name of active) {
        if (refs.prayerImgs.has(name)) continue;
        const inst = image({
            src: prayerSpriteSrc(name),
            alt: name,
            title: name,
            classes: [CLAN_MAP_ROW_PRAYER_ICON_CLASS],
            lazy: false,
            context: null,
            meta: null,
        });
        refs.prayerImgs.set(name, inst);
        refs.prayersInst.addChild(inst);
    }
}

function placeRows(host: Instance, refs: readonly RowRefs[]): void {
    let nextEl: ChildNode | null = host.el.firstChild;
    for (const ref of refs) {
        if (ref.instance.el === nextEl) {
            nextEl = nextEl?.nextSibling ?? null;
        } else {
            host.addBefore(ref.instance, nextEl);
        }
    }
}

function buildAwaitingMsg(): Instance {
    return paragraph({
        classes: [CLAN_MAP_EMPTY_CLASS],
        text: "Awaiting positions…",
        context: null,
        meta: null,
    });
}

function buildSection(title: string): {
    section: Instance;
    countSpan: Instance;
    titleInst: Instance;
    labelList: Instance;
} {
    const titleInst = heading("h2", {
        classes: [CLAN_MAP_SIDE_TITLE_CLASS],
        text: title,
        context: null,
        meta: null,
    });
    const countSpan = span({ classes: [CLAN_MAP_SIDE_COUNT_CLASS], context: null, meta: null });
    const header = div({ classes: [CLAN_MAP_SIDE_HEADER_CLASS], context: null, meta: null }, [countSpan, titleInst]);
    const labelList = div({ classes: [CLAN_MAP_LABEL_LIST_CLASS], context: null, meta: null });
    const section = div({ classes: [CLAN_MAP_SIDE_SECTION_CLASS], context: null, meta: null }, [header, labelList]);
    return { section, countSpan, titleInst, labelList };
}

function buildSidePanel(liveStore: LiveStore<PositionRow>, api: ClanMapApi): Instance {
    const active = buildSection("Live Clannies");
    const lastKnown = buildSection("Last Known");
    const empty = buildAwaitingMsg();
    const empty$ = div({ classes: [CLAN_MAP_SIDE_EMPTY_CLASS], context: null, meta: null }, [empty]);
    const handlers: RowHandlers = {
        onFocus: api.focusOnHash,
        onToggleFollow: api.toggleFollow,
        onToggleAlert: api.toggleAlert,
        followedHash$: api.followedHash$,
        alertedHashes$: api.alertedHashes$,
    };
    const rowPool = new Map<string, RowRefs>();

    function applyChange(change: LiveChange): void {
        for (const key of change.removed) {
            const refs = rowPool.get(key);
            if (refs === undefined) continue;
            refs.instance.destroy();
            rowPool.delete(key);
        }
        for (const key of change.changed) {
            const row = liveStore.get(key);
            if (row === undefined) continue;
            const existing = rowPool.get(key);
            if (existing === undefined) rowPool.set(key, buildRowShell(row, handlers));
            else patchRow(existing, row);
        }
        const all = liveStore
            .all()
            .slice()
            .sort((a, b) => a.latest_rsn.localeCompare(b.latest_rsn));
        const activeRefs: RowRefs[] = [];
        const lastKnownRefs: RowRefs[] = [];
        for (const row of all) {
            const refs = rowPool.get(row.account_hash);
            if (refs === undefined) continue;
            if (isPositionActive(row)) activeRefs.push(refs);
            else lastKnownRefs.push(refs);
        }
        placeRows(active.labelList, activeRefs);
        placeRows(lastKnown.labelList, lastKnownRefs);
        active.countSpan.setText(String(activeRefs.length));
        lastKnown.countSpan.setText(String(lastKnownRefs.length));
        active.titleInst.setText(activeRefs.length === 1 ? "Live Clannie" : "Live Clannies");
        active.section.el.classList.toggle("is-empty", activeRefs.length === 0);
        lastKnown.section.el.classList.toggle("is-empty", lastKnownRefs.length === 0);
        empty$.el.classList.toggle("is-visible", all.length === 0);
    }

    liveStore.onChange(applyChange);

    return div({ classes: [CLAN_MAP_SIDE_CLASS], context: null, meta: null }, [
        active.section,
        lastKnown.section,
        empty$,
    ]);
}

function buildPage(store: PositionsStore): HTMLElement {
    const map = clanMap({ positions$: store.positions$ as ReadSignal<PositionsState> });
    const mapHost = div({ classes: [CLAN_MAP_HOST_CLASS], context: null, meta: null }, [map.host]);
    const side = buildSidePanel(store.liveStore, map);
    return div({ classes: [ROUTE_ROOT_CLASS, CLAN_MAP_ROUTE_CLASS], context: null, meta: null }, [mapHost, side]).el;
}

export function renderClanMap(path: string): HTMLElement {
    const slug = clanSlugFromLivePath(path);
    if (slug.length === 0) return renderEmpty("");
    const store = createPositionsStore(slug);
    const root = buildPage(store);
    const offRoute = events.on("route:change", () => {
        store.dispose();
        offRoute();
    });
    return root;
}
