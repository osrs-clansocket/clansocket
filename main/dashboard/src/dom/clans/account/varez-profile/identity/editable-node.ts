import { createInstance, div, flashInvalid, input, span } from "../../../../factory";
import { isValidIdentityKey, profileStore } from "../../../../../ai/profile-store";
import {
    INLINE_INPUT_CLASS,
    INLINE_INPUT_INVALID_CLASS,
    ROW_ACTIONS_CLASS,
    TREE_BRANCH_CLASS,
    TREE_LEAF_CLASS,
    TREE_LINK_CLASS,
    TREE_ROW_CLASS,
    TREE_ROW_EDITING_CLASS,
    TREE_SEGMENT_CLASS,
    TREE_VALUE_CLASS,
    setEditing,
} from "../state.js";
import { iconBtn } from "../shared.js";
import { buildTreeLink } from "./tree.js";
import type { NodeRenderArgs } from "./tree-node.js";

export interface EditableNodeArgs extends NodeRenderArgs {
    isNew: boolean;
}

export function renderEditableNode({
    host,
    node,
    depth,
    isLast,
    parentPrefix,
    rerender,
    isNew,
}: EditableNodeArgs): void {
    const link = buildTreeLink(depth, isLast);
    const showValueField = node.fullKey !== null || isNew;
    const onKeydown = (e: KeyboardEvent): void => {
        if (e.key === "Enter") {
            e.preventDefault();
            save();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
        }
    };
    const segInput = input({
        classes: [INLINE_INPUT_CLASS, TREE_SEGMENT_CLASS],
        value: node.name,
        placeholder: parentPrefix.length === 0 ? "key (dots = depth)" : "name",
        ariaLabel: "Identity key",
        context: "edit the identity key segment",
        meta: ["input"],
        onKeydown,
    });
    const valInput: ReturnType<typeof input> | null = showValueField
        ? input({
              classes: [INLINE_INPUT_CLASS, TREE_VALUE_CLASS],
              value: node.value ?? "",
              placeholder: "Value",
              ariaLabel: "Identity value",
              context: "edit the identity value",
              meta: ["input"],
              onKeydown,
          })
        : null;
    function save(): void {
        const newSegment = segInput.el.value.trim();
        const newPath = parentPrefix + newSegment;
        if (!isValidIdentityKey(newPath)) {
            segInput.el.classList.add(INLINE_INPUT_INVALID_CLASS);
            flashInvalid(segInput.el);
            segInput.el.focus();
            return;
        }
        if (isNew) {
            if (!profileStore.setIdentity(newPath, valInput!.el.value)) {
                segInput.el.classList.add(INLINE_INPUT_INVALID_CLASS);
                flashInvalid(segInput.el);
                return;
            }
        } else {
            const oldPath = parentPrefix + node.name;
            if (oldPath !== newPath) profileStore.renamePrefix(oldPath, newPath);
            if (valInput !== null) profileStore.setIdentity(newPath, valInput.el.value);
        }
        setEditing(null);
        rerender();
    }
    function cancel(): void {
        setEditing(null);
        rerender();
    }
    const rowClasses = [TREE_ROW_CLASS, showValueField ? TREE_LEAF_CLASS : TREE_BRANCH_CLASS, TREE_ROW_EDITING_CLASS];
    const row = div({ classes: rowClasses, context: null, meta: null });
    if (link.length > 0) row.addChild(span({ classes: [TREE_LINK_CLASS], text: link, context: null, meta: null }));
    row.addChild(segInput);
    if (valInput !== null) row.addChild(valInput);
    row.addChild(
        div({ classes: [ROW_ACTIONS_CLASS], context: null, meta: null }, [
            iconBtn("check-lg", "save", save),
            iconBtn("x-lg", "cancel", cancel),
        ]),
    );
    createInstance(host).addChild(row);
    queueMicrotask(() => segInput.el.focus());
}
