import "../../../../styles/pages/routes/data-rights/index.css";
import { div, paragraph, section, signal } from "../../../factory";
import { dataRightsClient } from "../../../../state/data-rights/data-rights-client/index.js";
import { scopeToScope } from "../../../../state/data-rights/data-rights-client/scope-key.js";
import { scopesStore } from "../../../../state/data-rights/stores/scopes-store.js";
import { PAGE_SIZE } from "../../../../state/data-rights/page-state/constants.js";
import type { PageState } from "../../../../state/data-rights/page-state/types.js";
import { readUrl, writeUrl } from "../../../../state/data-rights/page-state/url.js";
import { setupWritesStream } from "../../../../state/data-rights/page-state/writes-stream.js";
import { wireChromeOffsets } from "../../../../state/effects/chrome-offsets.js";
import { deleteLocalRow, getLocalScopes, isLocalScope } from "../../../../state/data-rights/local-source.js";
import { buildRowDetail } from "./rows/row-detail.js";
import { buildLiveRowList, type LiveRowListHandle } from "./rows/row-list/live-list.js";
import type { RowListHandlers } from "./rows/row-list/types.js";
import { buildTree, scopeKeyFor, type TreeInstance } from "./tree";
import {
    DR_DETAIL_HOST_CLASS,
    DR_EMPTY_CLASS,
    DR_LIST_HOST_CLASS,
    DR_ROOT_CLASS,
    DR_TREE_HOST_CLASS,
} from "../../../../shared/constants/data-rights-route-constants.js";
import { GLASS_PANE_CLASS, GLASS_PANE_DIVIDED_CLASS } from "../../../../shared/constants/glass-constants.js";

const MOBILE_BREAKPOINT_REM = 40;

function isMobile(): boolean {
    return window.matchMedia(`(width<=${MOBILE_BREAKPOINT_REM}rem)`).matches;
}

export async function renderDataRights(): Promise<HTMLElement> {
    await scopesStore.refresh();
    const scopes = [...scopesStore.list$(), ...getLocalScopes()];
    const fromUrl = readUrl(scopes);
    const initialScope = fromUrl.scope;
    const firstHasRows = initialScope?.tables.find((t) => (typeof t === "string" ? true : t.hasRows));
    const firstName = firstHasRows ? (typeof firstHasRows === "string" ? firstHasRows : firstHasRows.name) : null;
    const initialTable = fromUrl.table ?? firstName ?? null;
    const expanded = new Set<string>();
    if (initialScope) expanded.add(scopeKeyFor(initialScope));
    else if (scopes[0]) expanded.add(scopeKeyFor(scopes[0]));
    const state: PageState = {
        scopes,
        scope: initialScope ? scopeToScope(initialScope) : null,
        scopeItem: initialScope,
        table: initialTable,
        expanded,
        rows: [],
        info: null,
        selectedIndex: -1,
        from: fromUrl.from,
        to: fromUrl.to,
        offset: 0,
        loadingMore: false,
        hasMore: false,
        view: initialTable ? (isMobile() ? "list" : "tree") : "tree",
    };
    const selectedKey = signal<string | null>(null);

    const goBack = (): void => {
        history.pushState(null, "", "/account");
        window.dispatchEvent(new PopStateEvent("popstate"));
    };

    const treeHost = div({
        classes: [GLASS_PANE_CLASS, GLASS_PANE_DIVIDED_CLASS, DR_TREE_HOST_CLASS],
        context: null,
        meta: null,
    });
    const listHost = div({
        classes: [GLASS_PANE_CLASS, GLASS_PANE_DIVIDED_CLASS, DR_LIST_HOST_CLASS],
        context: null,
        meta: null,
    });
    const detailHost = div({ classes: [GLASS_PANE_CLASS, DR_DETAIL_HOST_CLASS], context: null, meta: null });
    const root = section({ classes: [DR_ROOT_CLASS], data: { view: state.view }, context: null, meta: null }, [
        treeHost,
        listHost,
        detailHost,
    ]);

    const tearDownOffsets = wireChromeOffsets(root.el);
    let liveHandle: LiveRowListHandle | null = null;
    let treeInstance: TreeInstance | null = null;
    let closeWritesStream: (() => void) | null = null;
    const unmountObserver = new MutationObserver(() => {
        if (root.el.isConnected) return;
        tearDownOffsets();
        liveHandle?.teardown();
        if (closeWritesStream) closeWritesStream();
        unmountObserver.disconnect();
    });
    unmountObserver.observe(document.body, { childList: true, subtree: true });

    const rerenderDetail = (): void => {
        const row = liveHandle?.getRow(selectedKey() ?? "") ?? null;
        detailHost.setChildren(
            buildRowDetail(
                { scope: state.scope!, table: state.table ?? "", row, info: liveHandle?.info ?? null },
                {
                    onBack: isMobile()
                        ? () => {
                              state.view = "list";
                              root.setAttr("data-view", state.view);
                              rerenderDetail();
                          }
                        : undefined,
                },
            ),
        );
    };

    const rebuildList = async (): Promise<void> => {
        liveHandle?.teardown();
        liveHandle = null;
        if (!state.scope || !state.table) {
            listHost.setChildren(
                paragraph({
                    classes: [DR_EMPTY_CLASS],
                    text: "Pick a table from the tree.",
                    context: null,
                    meta: null,
                }),
            );
            return;
        }
        listHost.setChildren(paragraph({ classes: [DR_EMPTY_CLASS], text: "Loading…", context: null, meta: null }));
        const handle = await buildLiveRowList({
            scope: state.scope,
            table: state.table,
            from: state.from,
            to: state.to,
            limit: PAGE_SIZE,
            selectedKey,
            handlers,
            onSelectKey,
            onDeleteKey: (k) => void onDeleteKey(k),
        });
        if (!handle) {
            listHost.setChildren(paragraph({ classes: [DR_EMPTY_CLASS], text: "No data.", context: null, meta: null }));
            return;
        }
        liveHandle = handle;
        handle.onChange((change) => {
            const key = selectedKey();
            if (key !== null && change.changed.has(key)) rerenderDetail();
        });
        listHost.setChildren(handle.el);
    };

    const onSelectKey = (key: string): void => {
        selectedKey.set(key);
        state.view = isMobile() ? "detail" : state.view;
        root.setAttr("data-view", state.view);
        rerenderDetail();
    };

    const onDeleteKey = async (key: string): Promise<void> => {
        if (!state.scope || !state.table || !liveHandle) return;
        const row = liveHandle.getRow(key);
        if (!row) return;
        const pkRow: Record<string, unknown> = {};
        for (const k of liveHandle.info.pkCols) pkRow[k] = row[k];
        if (isLocalScope(state.scope)) {
            deleteLocalRow(state.scope, state.table, pkRow);
            await rebuildList();
        } else {
            await dataRightsClient.deleteRow(state.scope, state.table, pkRow);
        }
        if (selectedKey() === key) {
            selectedKey.set(null);
            rerenderDetail();
        }
    };

    const handlers: RowListHandlers = {
        onFilterChange: (from, to) => {
            state.from = from;
            state.to = to;
            selectedKey.set(null);
            writeUrl(state);
            void rebuildList();
            rerenderDetail();
        },
        onBulkDelete: async (from, to) => {
            if (!state.scope || !state.table) return;
            await dataRightsClient.deleteRange(state.scope, state.table, from, to);
            selectedKey.set(null);
            await rebuildList();
            rerenderDetail();
        },
        onBack: isMobile()
            ? () => {
                  state.view = "tree";
                  root.setAttr("data-view", state.view);
              }
            : undefined,
    };

    const rerenderTree = (): void => {
        const prevScroll = treeHost.el.querySelector<HTMLElement>(".tree");
        const prevScrollTop = prevScroll?.scrollTop ?? 0;
        treeInstance = buildTree(
            {
                scopes: state.scopes,
                activeTableKey: state.scopeItem && state.table ? `${scopeKeyFor(state.scopeItem)}:${state.table}` : "",
                expanded: state.expanded,
            },
            {
                onBack: goBack,
                onToggleFolder: (k) => {
                    if (state.expanded.has(k)) state.expanded.delete(k);
                    else state.expanded.add(k);
                    rerenderTree();
                },
                onPickTable: async (s, t) => {
                    state.scopeItem = s;
                    state.scope = scopeToScope(s);
                    state.table = t;
                    state.from = null;
                    state.to = null;
                    selectedKey.set(null);
                    state.view = isMobile() ? "list" : "tree";
                    root.setAttr("data-view", state.view);
                    writeUrl(state);
                    rerenderTree();
                    detailHost.setChildren(
                        paragraph({
                            classes: [DR_EMPTY_CLASS],
                            text: "Select a row to view.",
                            context: null,
                            meta: null,
                        }),
                    );
                    await rebuildList();
                    rerenderDetail();
                },
            },
        );
        treeHost.setChildren(treeInstance);
        const nextScroll = treeHost.el.querySelector<HTMLElement>(".tree");
        if (nextScroll) nextScroll.scrollTop = prevScrollTop;
    };

    rerenderTree();
    await rebuildList();
    rerenderDetail();

    closeWritesStream = setupWritesStream({
        state,
        getTreeTarget: () => treeInstance,
        rerenderTree,
        getLocalScopes,
    });

    return root.el;
}
