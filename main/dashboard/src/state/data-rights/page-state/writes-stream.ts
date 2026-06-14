import { dataRightsClient } from "../data-rights-client/index.js";
import { scopesStore } from "../stores/scopes-store.js";
import { serverScopeKeyFor } from "../data-rights-client/scope-key.js";
import type { PageState } from "./types.js";

const STREAM_DEBOUNCE_MS = 250;

export interface TableHasRowsTarget {
    setTableHasRows(scopeKey: string, table: string, hasRows: boolean): void;
}

export interface WritesStreamCtx {
    state: PageState;
    getTreeTarget: () => TableHasRowsTarget | null;
    rerenderTree: () => void;
    getLocalScopes: () => PageState["scopes"];
}

function findScopeByKey(state: PageState, scopeKey: string): PageState["scopes"][number] | undefined {
    return state.scopes.find((s) => serverScopeKeyFor(s) === scopeKey);
}

function isInsertLike(kind: string): boolean {
    return kind === "insert" || kind === "replace";
}

export function setupWritesStream(ctx: WritesStreamCtx): () => void {
    const { state } = ctx;

    const setScopeTableHasRows = (scopeKey: string, table: string, hasRows: boolean): void => {
        const scope = findScopeByKey(state, scopeKey);
        if (!scope) return;
        const entry = scope.tables.find((t) => (typeof t === "string" ? t : t.name) === table);
        if (!entry || typeof entry === "string") return;
        if (entry.hasRows === hasRows) return;
        entry.hasRows = hasRows;
        const tree = ctx.getTreeTarget();
        if (tree) tree.setTableHasRows(scopeKey, table, hasRows);
    };

    let scopesRefreshTimer: number | null = null;
    const refreshScopes = async (): Promise<void> => {
        await scopesStore.refresh();
        state.scopes = [...scopesStore.list$(), ...ctx.getLocalScopes()];
        if (state.scopeItem) {
            const activeKey = serverScopeKeyFor(state.scopeItem);
            state.scopeItem = findScopeByKey(state, activeKey) ?? state.scopeItem;
        }
        ctx.rerenderTree();
    };

    return dataRightsClient.openWritesStream((event) => {
        if (event.scopeAdded) {
            if (scopesRefreshTimer === null) {
                scopesRefreshTimer = window.setTimeout(() => {
                    scopesRefreshTimer = null;
                    void refreshScopes();
                }, STREAM_DEBOUNCE_MS);
            }
            return;
        }
        if (isInsertLike(event.kind)) {
            setScopeTableHasRows(event.scopeKey, event.table, true);
        } else if (event.kind === "delete" && event.nowHasRows === false) {
            setScopeTableHasRows(event.scopeKey, event.table, false);
        }
    });
}
