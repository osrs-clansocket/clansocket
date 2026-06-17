import "../../../styles/components/tree/tree-component.css";
import { button } from "../content-ops/button.js";
import { icon } from "../content-ops/graphics/media.js";
import { input } from "../content-ops/form/input-label.js";
import { span } from "../content-ops/text.js";
import { div } from "../layout-ops/structural/container.js";
import { wireDblClick } from "../event-helpers.js";
import { onceEffect } from "../effect-helpers.js";
import { INLINE_CONFIRM_HOST_CLASS } from "../layout-ops/inline/inline-confirm.js";
import type { Instance } from "../core/index.js";
import { wireDragSource, wireDropTarget, type DragPayload, type DropPosition } from "./tree-dnd.js";
import {
    IS_ACTIVE_CLASS,
    IS_EMPTY_CLASS,
    IS_EXPANDED_CLASS,
} from "../../../shared/constants/state-modifier-constants.js";

const TREE_CLASS = "tree";
const TREE_NODE_CLASS = "tree__node";
const TREE_FOLDER_CLASS = "tree__folder";
const TREE_FOLDER_ROW_CLASS = "tree__folder-row";
const TREE_FOLDER_ACTIONS_CLASS = "tree__folder-actions";
const TREE_LEAF_CLASS = "tree__leaf";
const TREE_LEAF_BODY_CLASS = "tree__leaf-body";
const TREE_LEAF_ACTIONS_CLASS = "tree__leaf-actions";
const TREE_LEAF_ACTION_CLASS = "tree__leaf-action";
const TREE_LEAF_ROW_CLASS = "tree__leaf-row";
const TREE_CHILDREN_CLASS = "tree__children";
const TREE_CHEVRON_CLASS = "tree__chevron";
const TREE_ICON_CLASS = "tree__icon";
const TREE_LABEL_CLASS = "tree__label";
const TREE_LABEL_INPUT_CLASS = "tree__label-input";

const CHEVRON_EXPANDED = "chevron-down";
const CHEVRON_COLLAPSED = "chevron-right";
const DISABLED_TRUE = "true";
const KEY_ENTER = "Enter";
const KEY_ESCAPE = "Escape";
const PENCIL_ICON = "pencil";

interface BaseNode {
    key: string;
    label: string;
    icon?: Instance | null;
    dragKind?: string;
    acceptDrops?: ReadonlyArray<string>;
    onReorder?: (event: ReorderEvent) => void;
}

export interface ReorderEvent {
    dragged: DragPayload;
    targetKey: string;
    position: DropPosition;
}

export type OnLabelEdit = (next: string) => Promise<boolean>;

export interface TreeLeafAction {
    iconName: string;
    title: string;
    onClick: (host: Instance) => void;
    danger?: boolean;
}

export interface TreeLeaf extends BaseNode {
    kind: "leaf";
    isActive?: boolean;
    isEmpty?: boolean;
    title?: string;
    onClick?: () => void;
    onMount?: (inst: Instance) => void;
    onLabelEdit?: OnLabelEdit;
    actions?: readonly TreeLeafAction[];
}

export interface TreeFolder extends BaseNode {
    kind: "folder";
    isExpanded: boolean;
    children: readonly TreeNode[];
    onToggle: () => void;
    onLabelEdit?: OnLabelEdit;
    actions?: readonly TreeLeafAction[];
}

export type TreeNode = TreeLeaf | TreeFolder;

interface LabelKit {
    elements: Instance[];
    enterEdit?: () => void;
}

interface LabelOptions {
    enableDblClick?: boolean;
}

function buildLabelOrEditor(label: string, onLabelEdit: OnLabelEdit | undefined, options: LabelOptions = {}): LabelKit {
    const display = span({ classes: [TREE_LABEL_CLASS], text: label, context: null, meta: null });
    if (!onLabelEdit) return { elements: [display] };

    const onEdit: OnLabelEdit = onLabelEdit;
    let isEditing = false;

    const editor = input({
        classes: [TREE_LABEL_INPUT_CLASS],
        type: "text",
        value: label,
        ariaLabel: `Rename ${label}`,
        hidden: "",
        context: "rename the item",
        meta: ["input"],
        onClick: { handler: (e) => e.stopPropagation(), raw: true },
        onKeydown: (e) => {
            if (e.key === KEY_ENTER) {
                e.preventDefault();
                editor.el.blur();
                return;
            }
            if (e.key === KEY_ESCAPE) {
                e.preventDefault();
                cancelEdit();
            }
        },
        onBlur: () => void commitEdit(),
    });

    function cancelEdit(): void {
        if (!isEditing) return;
        isEditing = false;
        editor.el.hidden = true;
        display.el.hidden = false;
    }

    async function commitEdit(): Promise<void> {
        if (!isEditing) return;
        isEditing = false;
        const next = editor.el.value.trim();
        editor.el.hidden = true;
        display.el.hidden = false;
        if (next.length === 0 || next === label) return;
        await onEdit(next);
    }

    function enterEdit(): void {
        if (isEditing) return;
        isEditing = true;
        editor.el.value = label;
        display.el.hidden = true;
        editor.el.hidden = false;
        editor.el.focus();
        editor.el.select();
    }

    if (options.enableDblClick !== false) {
        wireDblClick(display.el, enterEdit);
    }
    return { elements: [display, editor], enterEdit };
}

function buildLeafBody(node: TreeLeaf, labelElements: readonly Instance[]): Instance {
    const classes = [TREE_LEAF_BODY_CLASS];
    if (node.isActive) classes.push(IS_ACTIVE_CLASS);
    if (node.isEmpty) classes.push(IS_EMPTY_CLASS);
    const children: Instance[] = [];
    if (node.icon) children.push(node.icon);
    for (const el of labelElements) children.push(el);
    return button(
        {
            classes,
            type: "button",
            title: node.title ?? node.label,
            disabled: node.isEmpty ? DISABLED_TRUE : undefined,
            context: `select ${node.label}`,
            meta: ["nav"],
            onClick: () => {
                if (node.isEmpty) return;
                node.onClick?.();
            },
        },
        children,
    );
}

function buildLeafAction(action: TreeLeafAction, getHost: () => Instance | null): Instance {
    const classes = action.danger ? [TREE_LEAF_ACTION_CLASS, "is-danger"] : [TREE_LEAF_ACTION_CLASS];
    const meta = action.danger ? (["action", "destructive"] as const) : (["action"] as const);
    return button(
        {
            classes,
            type: "button",
            title: action.title,
            ariaLabel: action.title,
            context: action.title,
            meta,
            onClick: () => {
                const host = getHost();
                if (host !== null) action.onClick(host);
            },
        },
        [icon({ name: action.iconName, context: null, meta: null }).el],
    );
}

function actionsFor(
    label: string,
    enterEdit: (() => void) | undefined,
    extra: readonly TreeLeafAction[] | undefined,
): TreeLeafAction[] {
    const out: TreeLeafAction[] = [];
    if (enterEdit) {
        out.push({
            iconName: PENCIL_ICON,
            title: `Rename ${label}`,
            onClick: enterEdit,
        });
    }
    if (extra) for (const a of extra) out.push(a);
    return out;
}

function wireNodeDnd(el: HTMLElement, node: TreeNode, allowInto: boolean): void {
    if (node.dragKind !== undefined) {
        wireDragSource(el, { key: node.key, kind: node.dragKind });
    }
    if (node.acceptDrops !== undefined && node.onReorder !== undefined) {
        const onReorder = node.onReorder;
        const key = node.key;
        wireDropTarget(el, {
            accepts: new Set(node.acceptDrops),
            allowInto,
            onDrop: (payload, position) => {
                onReorder({ dragged: payload, targetKey: key, position });
            },
        });
    }
}

function buildActionsCluster(actions: readonly TreeLeafAction[], containerClass: string): { host: Instance } {
    let hostRef: Instance | null = null;
    const container = div(
        { classes: [containerClass], context: null, meta: null },
        actions.map((a) => buildLeafAction(a, () => hostRef)),
    );
    const host = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null }, [container]);
    hostRef = host;
    return { host };
}

function buildLeaf(node: TreeLeaf): Instance {
    const labelKit = buildLabelOrEditor(node.label, node.onLabelEdit);
    const body = buildLeafBody(node, labelKit.elements);
    const rowChildren: Instance[] = [body];
    const actions = actionsFor(node.label, labelKit.enterEdit, node.actions);
    if (actions.length > 0) {
        const { host } = buildActionsCluster(actions, TREE_LEAF_ACTIONS_CLASS);
        rowChildren.push(host);
    }
    const row = div({ classes: [TREE_LEAF_ROW_CLASS, TREE_LEAF_CLASS], context: null, meta: null }, rowChildren);
    wireNodeDnd(row.el, node, false);
    node.onMount?.(body);
    return row;
}

function folderHeaderChildren(node: TreeFolder, labelElements: readonly Instance[]): Instance[] {
    const chevron = icon({
        name: node.isExpanded ? CHEVRON_EXPANDED : CHEVRON_COLLAPSED,
        classes: [TREE_CHEVRON_CLASS],
        context: null,
        meta: null,
    });
    const out: Instance[] = [chevron];
    if (node.icon) out.push(node.icon);
    for (const el of labelElements) out.push(el);
    return out;
}

function buildFolder(node: TreeFolder): Instance {
    const folderClasses = [TREE_FOLDER_CLASS];
    if (node.isExpanded) folderClasses.push(IS_EXPANDED_CLASS);
    const labelKit = buildLabelOrEditor(node.label, node.onLabelEdit, { enableDblClick: false });
    const folderBtn = button(
        {
            classes: folderClasses,
            type: "button",
            context: `expand or collapse ${node.label}`,
            meta: ["disclosure"],
            onClick: () => node.onToggle(),
        },
        folderHeaderChildren(node, labelKit.elements),
    );
    const actions = actionsFor(node.label, labelKit.enterEdit, node.actions);
    let header: Instance;
    if (actions.length > 0) {
        const { host } = buildActionsCluster(actions, TREE_FOLDER_ACTIONS_CLASS);
        header = div({ classes: [TREE_FOLDER_ROW_CLASS], context: null, meta: null }, [folderBtn, host]);
    } else {
        header = folderBtn;
    }
    const children: Instance[] = [header];
    if (node.isExpanded && node.children.length > 0) {
        const childGroup = div(
            { classes: [TREE_CHILDREN_CLASS], effects: onceEffect("fade-in"), context: null, meta: null },
            node.children.map(buildNode),
        );
        children.push(childGroup);
    }
    wireNodeDnd(header.el, node, true);
    return div({ classes: [TREE_NODE_CLASS], context: null, meta: null }, children);
}

function buildNode(node: TreeNode): Instance {
    if (node.kind === "folder") return buildFolder(node);
    return buildLeaf(node);
}

export interface TreeViewOptions {
    variant?: "compact" | "comfortable";
}

export function treeView(nodes: readonly TreeNode[], opts: TreeViewOptions = {}): Instance {
    const classes = [TREE_CLASS];
    if (opts.variant === "comfortable") classes.push("tree--comfortable");
    return div({ classes, context: null, meta: null }, nodes.map(buildNode));
}

export { TREE_ICON_CLASS };
