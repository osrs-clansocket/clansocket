export {
    FORM_CLAIM_FORM as FORM_CLASS,
    FORM_FIELD_LABEL as FIELD_LABEL_CLASS,
    FORM_FORM_ROW as FORM_ROW_CLASS,
    FORM_HINT as HINT_CLASS,
} from "../../../forms/form-classes.js";

export {
    ACCOUNT_EMPTY_CLASS as EMPTY_CLASS,
    ACCOUNT_LIST_CLASS as LIST_CLASS,
    ACCOUNT_ROW_PRIMARY_CLASS as ROW_PRIMARY_CLASS,
} from "../../../../shared/constants/account-constants.js";
export const SESSION_LOG_CLASS = "account__session-log";
export const TREE_CLASS = "account__tree";
export const TREE_ROW_CLASS = "account__tree-row";
export const TREE_BRANCH_CLASS = "account__tree-row--branch";
export const TREE_LEAF_CLASS = "account__tree-row--leaf";
export const TREE_ROW_EDITING_CLASS = "account__tree-row--editing";
export const TREE_SEGMENT_CLASS = "account__tree-segment";
export const TREE_LINK_CLASS = "account__tree-link";
export const TREE_VALUE_CLASS = "account__tree-value";
export const ROW_CLASS = "account__row";
export const ROW_EDITING_CLASS = "account__row--editing";
export const ROW_META_CLASS = "account__row-meta";
export const ROW_ACTIONS_CLASS = "account__row-actions";
export const ICON_BTN_CLASS = "account__icon-btn";
export const HEADER_ROW_CLASS = "account__section-header";
export const INLINE_INPUT_CLASS = "account__inline-input";
export const INLINE_INPUT_INVALID_CLASS = "account__inline-input--invalid";
export const SESSION_EDIT_GRID_CLASS = "account__session-edit-grid";

export type EditingState =
    | { kind: "new-identity" }
    | { kind: "edit-identity"; key: string }
    | { kind: "edit-focus" }
    | { kind: "new-session" }
    | { kind: "edit-session"; turn: number }
    | null;

let _editing: EditingState = null;

export function getEditing(): EditingState {
    return _editing;
}

export function setEditing(s: EditingState): void {
    _editing = s;
}
