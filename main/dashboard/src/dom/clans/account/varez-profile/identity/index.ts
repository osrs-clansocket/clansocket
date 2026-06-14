import { createInstance, div, paragraph } from "../../../../factory";
import { EMPTY_CLASS, LIST_CLASS, TREE_CLASS, getEditing, setEditing } from "../state.js";
import { renderSectionHeader } from "../shared.js";
import { renderEditableNode } from "./editable-node.js";
import { buildTree, emptyNode } from "./tree.js";
import { renderTreeNode } from "./tree-node.js";

export function renderIdentity(host: HTMLElement, identity: Record<string, string>, rerender: () => void): void {
    const root = createInstance(host);
    renderSectionHeader(host, "Identity", "+ add entry", () => {
        setEditing({ kind: "new-identity" });
        rerender();
    });

    const list = div({ classes: [LIST_CLASS, TREE_CLASS], context: null, meta: null });
    const editing = getEditing();

    if (editing?.kind === "new-identity") {
        renderEditableNode({
            host: list.el,
            node: emptyNode(""),
            depth: 0,
            isLast: true,
            parentPrefix: "",
            rerender,
            isNew: true,
        });
    }

    const keys = Object.keys(identity);
    if (keys.length === 0 && editing?.kind !== "new-identity") {
        root.addChild(paragraph({ classes: [EMPTY_CLASS], text: "No identity facts yet", context: null, meta: null }));
        return;
    }

    const tree = buildTree(identity);
    for (let i = 0; i < tree.children.length; i++) {
        renderTreeNode({
            host: list.el,
            node: tree.children[i]!,
            depth: 0,
            isLast: i === tree.children.length - 1,
            parentPrefix: "",
            rerender,
        });
    }
    root.addChild(list);
}
