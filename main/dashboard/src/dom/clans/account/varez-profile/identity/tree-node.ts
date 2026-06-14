import { createInstance, div, span } from "../../../../factory";
import { isReservedIdentityPrefix, profileStore } from "../../../../../ai/profile-store";
import {
    ROW_ACTIONS_CLASS,
    TREE_BRANCH_CLASS,
    TREE_LEAF_CLASS,
    TREE_LINK_CLASS,
    TREE_ROW_CLASS,
    TREE_SEGMENT_CLASS,
    TREE_VALUE_CLASS,
    getEditing,
    setEditing,
} from "../state.js";
import { iconBtn } from "../shared.js";
import { renderEditableNode } from "./editable-node.js";
import { buildTreeLink, type TreeNode } from "./tree.js";

export interface NodeRenderArgs {
    host: HTMLElement;
    node: TreeNode;
    depth: number;
    isLast: boolean;
    parentPrefix: string;
    rerender: () => void;
}

export function renderTreeNode(args: NodeRenderArgs): void {
    const { host, node, depth, isLast, parentPrefix, rerender } = args;
    const isLeaf = node.fullKey !== null;
    const hasChildren = node.children.length > 0;
    const nodePath = parentPrefix + node.name;
    const isReserved = isReservedIdentityPrefix(nodePath);
    const editing = getEditing();
    const isEditing = !isReserved && editing?.kind === "edit-identity" && editing.key === nodePath;

    if (isEditing) {
        renderEditableNode({ ...args, isNew: false });
    } else {
        const link = buildTreeLink(depth, isLast);
        const row = div({
            classes: [TREE_ROW_CLASS, isLeaf ? TREE_LEAF_CLASS : TREE_BRANCH_CLASS],
            context: null,
            meta: null,
        });
        if (link.length > 0) row.addChild(span({ classes: [TREE_LINK_CLASS], text: link, context: null, meta: null }));
        row.addChild(span({ classes: [TREE_SEGMENT_CLASS], text: node.name, context: null, meta: null }));
        if (isLeaf)
            row.addChild(span({ classes: [TREE_VALUE_CLASS], text: node.value ?? "", context: null, meta: null }));
        if (!isReserved) {
            row.addChild(
                div({ classes: [ROW_ACTIONS_CLASS], context: null, meta: null }, [
                    iconBtn("pencil", "edit", () => {
                        setEditing({ kind: "edit-identity", key: nodePath });
                        rerender();
                    }),
                    iconBtn("trash", "remove", () => {
                        if (hasChildren) profileStore.removePrefix(nodePath);
                        else profileStore.removeIdentity(nodePath);
                        const cur = getEditing();
                        if (cur?.kind === "edit-identity" && cur.key === nodePath) setEditing(null);
                        rerender();
                    }),
                ]),
            );
        }
        createInstance(host).addChild(row);
    }

    const childPrefix = nodePath + ".";
    for (let i = 0; i < node.children.length; i++) {
        renderTreeNode({
            host,
            node: node.children[i]!,
            depth: depth + 1,
            isLast: i === node.children.length - 1,
            parentPrefix: childPrefix,
            rerender,
        });
    }
}
