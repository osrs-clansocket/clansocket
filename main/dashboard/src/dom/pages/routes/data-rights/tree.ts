import {
    BTN_VARIANT_OUTLINE,
    button,
    div,
    header,
    icon,
    image,
    snapshot,
    span,
    treeView,
    TREE_ICON_CLASS,
    type Instance,
    type TreeNode,
} from "../../../factory";
import type { ScopeListItem, ScopeListTable } from "../../../../state/data-rights/data-rights-client/index.js";
import { tableMeta } from "../../../../state/data-rights/table-meta.js";
import { tableIconSpec } from "../../../../state/data-rights/assets/table-meta-icon.js";
import {
    DR_PANE_HEADER_CLASS,
    DR_PANE_TITLE_CLASS,
    DR_TREE_WRAP_CLASS,
} from "../../../../shared/constants/data-rights-route-constants.js";
import { GLASS_PANE_INNER_CLASS } from "../../../../shared/constants/glass-constants.js";
import { IS_EMPTY_CLASS } from "../../../../shared/constants/state-modifier-constants.js";

const SCOPE_ICONS: Record<string, string> = {
    app: "person-vcard",
    varez: "robot",
    bot: "discord",
    clan: "people-fill",
    clan_audit: "clipboard-check",
    plugin: "puzzle",
    local: "hdd",
};
const FOLDER_FALLBACK_ICON = "folder";
const DISABLED_TRUE = "true";
const TITLE_BACK = "← Profile";
const TITLE_HEADING = "Databases";

export function scopeKeyFor(s: { kind: string; clanId?: string; mode?: string }): string {
    return [s.kind, s.clanId ?? "", s.mode ?? ""].join(":");
}

export interface TreeState {
    scopes: ScopeListItem[];
    activeTableKey: string;
    expanded: Set<string>;
}

export interface TreeHandlers {
    onPickTable: (scope: ScopeListItem, table: string) => void;
    onToggleFolder: (scopeKey: string) => void;
    onBack?: () => void;
}

function normalizeTable(t: ScopeListTable | string): ScopeListTable {
    if (typeof t === "string") return { name: t, hasRows: true };
    return t;
}

interface LeafRef {
    instance: Instance;
    hasRows: boolean;
}

function buildLeafIcon(table: string, label: string): Instance {
    const spec = tableIconSpec(table);
    if (spec.kind === "asset") {
        return image({ src: spec.src, alt: label, classes: [TREE_ICON_CLASS], context: null, meta: null });
    }
    return icon({ name: spec.name, classes: [TREE_ICON_CLASS], context: null, meta: null });
}

interface LeafContext {
    scope: ScopeListItem;
    table: ScopeListTable;
    isActive: boolean;
    onPick: (s: ScopeListItem, t: string) => void;
    leafRefs: Map<string, LeafRef>;
}

function leafNodeFor(ctx: LeafContext): TreeNode {
    const meta = tableMeta(ctx.table.name);
    const key = `${scopeKeyFor(ctx.scope)}:${ctx.table.name}`;
    return {
        kind: "leaf",
        key,
        label: snapshot(meta.label),
        icon: buildLeafIcon(ctx.table.name, meta.label),
        isActive: ctx.isActive,
        isEmpty: !ctx.table.hasRows,
        title: ctx.table.name,
        onClick: () => {
            const ref = ctx.leafRefs.get(key);
            if (ref && !ref.hasRows) return;
            ctx.onPick(ctx.scope, ctx.table.name);
        },
        onMount: (inst) => ctx.leafRefs.set(key, { instance: inst, hasRows: ctx.table.hasRows }),
    };
}

function folderNodeFor(
    scope: ScopeListItem,
    isExpanded: boolean,
    activeTableKey: string,
    handlers: TreeHandlers,
    leafRefs: Map<string, LeafRef>,
): TreeNode {
    const key = scopeKeyFor(scope);
    return {
        kind: "folder",
        key,
        label: scope.label,
        icon: icon({
            name: SCOPE_ICONS[scope.kind] ?? FOLDER_FALLBACK_ICON,
            classes: [TREE_ICON_CLASS],
            context: null,
            meta: null,
        }),
        isExpanded,
        children: scope.tables.map((tRaw) => {
            const t = normalizeTable(tRaw);
            return leafNodeFor({
                scope,
                table: t,
                isActive: `${key}:${t.name}` === activeTableKey,
                onPick: handlers.onPickTable,
                leafRefs,
            });
        }),
        onToggle: () => handlers.onToggleFolder(key),
    };
}

function buildTreeHeader(handlers: TreeHandlers): Instance {
    const children: Instance[] = [];
    if (handlers.onBack) {
        children.push(
            button({
                variant: BTN_VARIANT_OUTLINE,
                text: TITLE_BACK,
                context: "go back to your profile",
                meta: ["nav"],
                onClick: () => handlers.onBack!(),
            }),
        );
    }
    children.push(span({ classes: [DR_PANE_TITLE_CLASS], text: TITLE_HEADING, context: null, meta: null }));
    return header({ classes: [DR_PANE_HEADER_CLASS], context: null, meta: null }, children);
}

export interface TreeInstance extends Instance {
    setTableHasRows(scopeKey: string, table: string, hasRows: boolean): void;
}

export function buildTree(state: TreeState, handlers: TreeHandlers): TreeInstance {
    const leafRefs = new Map<string, LeafRef>();
    const nodes = state.scopes.map((s) =>
        folderNodeFor(s, state.expanded.has(scopeKeyFor(s)), state.activeTableKey, handlers, leafRefs),
    );
    const treeEl = treeView(nodes);
    const root = div({ classes: [GLASS_PANE_INNER_CLASS, DR_TREE_WRAP_CLASS], context: null, meta: null }, [
        buildTreeHeader(handlers),
        treeEl,
    ]);
    return Object.assign(root, {
        setTableHasRows(scopeKey: string, table: string, hasRows: boolean): void {
            const ref = leafRefs.get(`${scopeKey}:${table}`);
            if (!ref || ref.hasRows === hasRows) return;
            ref.hasRows = hasRows;
            ref.instance.toggleClass(IS_EMPTY_CLASS, !hasRows);
            if (hasRows) ref.instance.removeAttr("disabled");
            else ref.instance.setAttr("disabled", DISABLED_TRUE);
        },
    });
}
