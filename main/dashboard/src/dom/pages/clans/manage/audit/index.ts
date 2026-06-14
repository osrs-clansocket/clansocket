import {
    button,
    createLiveStore,
    div,
    liveView,
    paragraph,
    type LiveStore,
    type LiveViewHandle,
} from "../../../../factory";
import { events } from "../../../../../managers/events";
import type { PresentedEntry } from "../../../../../state/clans/audit-presenters/index.js";
import { buildFilterBar, type FilterBarState } from "./filters.js";
import { mountClusterRow, patchClusterRow } from "./row.js";
import { buildAnalyticsStrip, buildIntegrityIndicator, emptyStats, updateStats } from "./side-info.js";
import { type ClusterRow, currentFilters } from "../../../../../state/clans/audit/cluster-defs.js";
import { type AuditFeed, createAuditFeed } from "../../../../../state/clans/audit/cluster-feed.js";
import { PAGE_LIMIT } from "../../../../../state/clans/audit/types.js";
import {
    AUDIT_EMPTY_CLASS,
    AUDIT_HOST_CLASS,
    AUDIT_LIST_CLASS,
    AUDIT_ROW_CLASS,
    AUDIT_ROW_LOAD_MORE_CLASS,
    AUDIT_STATS_HOST_CLASS,
} from "../../../../../shared/constants/audit-route-constants.js";

const TOPIC = "clan-audit";

function buildAuditTab(slug: string): HTMLElement {
    const host = div({ classes: [AUDIT_HOST_CLASS], context: null, meta: null });
    const statsHost = div({ classes: [AUDIT_STATS_HOST_CLASS], context: null, meta: null });
    const list = div({ classes: [AUDIT_LIST_CLASS], context: null, meta: null });
    const empty = paragraph({
        classes: [AUDIT_EMPTY_CLASS],
        text: "No audit entries yet.",
        hidden: "",
        context: null,
        meta: null,
    });

    const state: FilterBarState = { activeKind: "all", activeRange: "all" };
    const statsRef = { value: emptyStats() };
    const renderStats = (): void => {
        statsHost.setChildren(buildAnalyticsStrip(statsRef.value));
    };
    const integrityIndicator = buildIntegrityIndicator(slug, list);

    let feed: AuditFeed | null = null;
    let store: LiveStore<ClusterRow> | null = null;
    let view: LiveViewHandle | null = null;

    const loadMoreRow = button({
        classes: [AUDIT_ROW_CLASS, AUDIT_ROW_LOAD_MORE_CLASS],
        text: "Load more",
        context: "load more audit entries",
        meta: ["action", "audit"],
        onClick: () => void doLoadMore(),
    });
    const renderLoadMore = (): void => {
        if (feed?.hasMore()) {
            list.addChild(loadMoreRow);
            loadMoreRow.el.disabled = false;
            loadMoreRow.setText("Load more");
        } else {
            loadMoreRow.detach();
        }
    };
    const syncEmpty = (): void => {
        empty.el.hidden = (store?.size() ?? 0) > 0;
    };
    async function doLoadMore(): Promise<void> {
        if (!feed || !store) return;
        loadMoreRow.el.disabled = true;
        loadMoreRow.setText("Loading…");
        store.appendRows(await feed.loadMore());
        renderLoadMore();
    }

    let filterBar = buildFilterBar(state, onKindChange, onRangeChange, integrityIndicator);
    function refreshFilterBar(): void {
        const fresh = buildFilterBar(state, onKindChange, onRangeChange, integrityIndicator);
        filterBar.el.replaceWith(fresh.el);
        filterBar = fresh;
    }
    function onKindChange(key: string): void {
        if (state.activeKind === key) return;
        state.activeKind = key;
        refreshFilterBar();
        rebuild();
    }
    function onRangeChange(key: string): void {
        if (state.activeRange === key) return;
        state.activeRange = key;
        refreshFilterBar();
        rebuild();
    }

    function rebuild(): void {
        view?.teardown();
        statsRef.value = emptyStats();
        renderStats();
        feed = createAuditFeed({
            slug,
            filters: currentFilters(state.activeKind, state.activeRange),
            limit: PAGE_LIMIT,
            onEntry: (e) => updateStats(statsRef.value, e),
            onLoaded: () => {
                renderStats();
                renderLoadMore();
                syncEmpty();
            },
        });
        store = createLiveStore<ClusterRow>({ topic: TOPIC, keyOf: (r) => r.key, source: feed.source });
        store.onChange(() => {
            renderStats();
            syncEmpty();
        });
        view = liveView<ClusterRow>({
            container: list,
            store,
            mountRow: (r) => mountClusterRow(r, slug),
            patchRow: (inst, r) => patchClusterRow(inst, r),
        });
        view.start();
    }

    host.setChildren(filterBar, statsHost, list, empty);
    rebuild();

    const offRoute = events.on("route:change", () => {
        view?.teardown();
        offRoute();
    });
    return host.el;
}

export { buildAuditTab };
export type { PresentedEntry };
