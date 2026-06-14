import {
    button,
    createLiveStore,
    div,
    icon,
    liveView,
    span,
    type LiveChange,
    type LiveSource,
    type LiveViewHandle,
    type ReadSignal,
} from "../../../../../factory/index.js";
import {
    dataRightsClient,
    type BrowseResponse,
    type Scope,
} from "../../../../../../state/data-rights/data-rights-client/index.js";
import { projectionSource } from "../../../../../../state/data-rights/data-rights-client/streams/projection-source.js";
import { browseLocal, isLocalScope } from "../../../../../../state/data-rights/local-source.js";
import { buildFilterBar } from "./filter-bar.js";
import { buildHeader } from "./header.js";
import { mountDataRow, patchDataRow, type DataRowCtx } from "./row-item.js";
import { pkKeyOf } from "../../../../../../state/data-rights/page-state/row-helpers.js";
import type { RowListHandlers, RowListState } from "./types.js";
import {
    DR_LIST_PANE_CLASS,
    DR_NEW_ENTRIES_CLASS,
    DR_NEW_ENTRIES_COUNT_CLASS,
    DR_NEW_ENTRIES_ICON_CLASS,
    DR_ROW_SCROLL_CLASS,
    DR_ROW_SCROLL_WRAP_CLASS,
} from "../../../../../../shared/constants/data-rights-route-constants.js";
import { GLASS_PANE_INNER_CLASS } from "../../../../../../shared/constants/glass-constants.js";

const LOAD_MORE_THRESHOLD_PX = 200;
const TOP_TOLERANCE_PX = 4;

export interface LiveRowListConfig {
    scope: Scope;
    table: string;
    from: number | null;
    to: number | null;
    limit: number;
    selectedKey: ReadSignal<string | null>;
    handlers: RowListHandlers;
    onSelectKey: (key: string) => void;
    onDeleteKey: (key: string) => void;
}

export interface LiveRowListHandle {
    el: HTMLElement;
    info: BrowseResponse;
    getRow(key: string): Record<string, unknown> | undefined;
    onChange(listener: (change: LiveChange) => void): () => void;
    teardown(): void;
}

function localSource(scope: Scope, table: string, limit: number): LiveSource {
    return {
        subscribe(onSnapshot): () => void {
            onSnapshot({ topic: `local:${table}`, seq: 0, rows: browseLocal(scope, table, limit, 0).rows });
            return () => {};
        },
    };
}

export async function buildLiveRowList(config: LiveRowListConfig): Promise<LiveRowListHandle | null> {
    const local = isLocalScope(config.scope);
    const info = local
        ? browseLocal(config.scope, config.table, config.limit, 0)
        : await dataRightsClient.browse({
              scope: config.scope,
              table: config.table,
              from: config.from ?? undefined,
              to: config.to ?? undefined,
              limit: config.limit,
              offset: 0,
          });
    if (!info) return null;
    const ctx: DataRowCtx = {
        table: config.table,
        pkCols: info.pkCols,
        tsCol: info.tsCol,
        secretColumns: info.secretColumns,
        canDeleteRow: info.canDeleteRow,
        selectedKey: config.selectedKey,
        onSelect: config.onSelectKey,
        onDelete: config.onDeleteKey,
    };
    const scroll = div({ classes: [DR_ROW_SCROLL_CLASS], context: null, meta: null });
    const store = createLiveStore<Record<string, unknown>>({
        topic: `${config.scope.kind}:${config.scope.clanId ?? ""}:${config.scope.mode ?? ""}:${config.table}`,
        keyOf: (row) => pkKeyOf(row, info.pkCols),
        source: local
            ? localSource(config.scope, config.table, config.limit)
            : projectionSource({
                  kind: config.scope.kind,
                  clanId: config.scope.clanId,
                  mode: config.scope.mode,
                  table: config.table,
                  from: config.from ?? undefined,
                  to: config.to ?? undefined,
                  limit: config.limit,
                  offset: 0,
              }),
    });
    const view: LiveViewHandle = liveView<Record<string, unknown>>({
        container: scroll,
        store,
        mountRow: (row) => mountDataRow(row, ctx),
        patchRow: (inst, row) => patchDataRow(inst, row, ctx),
    });

    const seen = new Set<string>();
    let appending = false;
    let loadingMore = false;
    let newEntriesCount = 0;

    const loadMore = async (): Promise<void> => {
        if (loadingMore || store.size() >= info.total) return;
        loadingMore = true;
        const offset = store.size();
        const page = local
            ? browseLocal(config.scope, config.table, config.limit, offset)
            : await dataRightsClient.browse({
                  scope: config.scope,
                  table: config.table,
                  from: config.from ?? undefined,
                  to: config.to ?? undefined,
                  limit: config.limit,
                  offset,
              });
        loadingMore = false;
        if (page) {
            appending = true;
            store.appendRows(page.rows);
            appending = false;
        }
    };

    const notifyCount = span({
        classes: [DR_NEW_ENTRIES_COUNT_CLASS],
        text: "",
        context: null,
        meta: null,
    });
    const notifyBtn = button(
        {
            classes: [DR_NEW_ENTRIES_CLASS],
            ariaLabel: "Scroll to new entries",
            type: "button",
            hidden: "true",
            context: "scroll to the newest entries",
            meta: ["nav", "data"],
            onClick: () => {
                scroll.el.scrollTo({ top: 0, behavior: "smooth" });
                newEntriesCount = 0;
                updateNotify();
            },
        },
        [notifyCount, icon({ name: "chevron-up", classes: [DR_NEW_ENTRIES_ICON_CLASS], context: null, meta: null })],
    );
    function updateNotify(): void {
        if (newEntriesCount > 0) {
            notifyCount.setText(`${newEntriesCount} new`);
            notifyBtn.el.hidden = false;
        } else {
            notifyBtn.el.hidden = true;
        }
    }
    store.onChange((change) => {
        if (appending) return;
        let added = 0;
        for (const k of change.changed) {
            if (!seen.has(k)) added++;
            seen.add(k);
        }
        for (const k of change.removed) seen.delete(k);
        if (added > 0 && scroll.el.scrollTop > TOP_TOLERANCE_PX) {
            newEntriesCount += added;
            updateNotify();
        }
    });

    const onScroll = (): void => {
        const el = scroll.el;
        if (el.scrollTop <= TOP_TOLERANCE_PX && newEntriesCount > 0) {
            newEntriesCount = 0;
            updateNotify();
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MORE_THRESHOLD_PX) void loadMore();
    };
    scroll.el.addEventListener("scroll", onScroll, { passive: true });

    const listState: RowListState = {
        scope: config.scope,
        table: config.table,
        from: config.from,
        to: config.to,
        rows: [],
        info,
        selectedIndex: -1,
        loadingMore: false,
        hasMore: info.total > config.limit,
    };
    const header = buildHeader(listState, config.handlers);
    const filter = buildFilterBar(listState, config.handlers);
    const scrollWrap = div({ classes: [DR_ROW_SCROLL_WRAP_CLASS], context: null, meta: null }, [scroll, notifyBtn]);
    const pane = div({ classes: [GLASS_PANE_INNER_CLASS, DR_LIST_PANE_CLASS], context: null, meta: null }, [
        header.instance,
        filter,
        scrollWrap,
    ]);
    view.start();
    return {
        el: pane.el,
        info,
        getRow: (key) => store.get(key),
        onChange: (listener) => store.onChange(listener),
        teardown: (): void => {
            scroll.el.removeEventListener("scroll", onScroll);
            view.teardown();
        },
    };
}
