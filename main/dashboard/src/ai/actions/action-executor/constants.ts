export const HIGHLIGHT_EFFECT = "highlight-ring";
export const HIGHLIGHT_DURATION = 3000;
export const PANEL_HIDDEN_CLASS = "ai-bar--panel-hidden";

export const ERR_NOT_FOUND = "element-not-found";
export const ERR_NOT_FORM_CONTROL = "not-form-control";
export const ERR_NOT_CHECKABLE = "not-checkable";
export const ERR_NOT_SELECT = "not-select";
export const ERR_NOT_FORM = "not-form";
export const ERR_NOT_DETAILS = "not-details";
export const ERR_SKIPPED_ROUTE = "skipped-route-precedence";

export const VERB_CLICK = "click";
export const VERB_SET_VALUE = "setValue";
export const VERB_CHECK = "check";
export const VERB_SELECT_OPTION = "selectOption";
export const VERB_PRESS_KEY = "pressKey";
export const VERB_TOGGLE_OPEN = "toggleOpen";
export const VERB_SUBMIT = "submit";
export const VERB_FOCUS = "focus";
export const VERB_BLUR = "blur";
export const VERB_NAVIGATE = "navigate";
export const VERB_HIGHLIGHT = "highlight";
export const VERB_SHOW = "show";
export const VERB_ROUTE = "route";

export const AUDIT_VERBS = new Set<string>([
    VERB_CLICK,
    VERB_SET_VALUE,
    VERB_CHECK,
    VERB_SELECT_OPTION,
    VERB_SUBMIT,
    VERB_TOGGLE_OPEN,
    VERB_ROUTE,
    VERB_PRESS_KEY,
]);

export interface ExecuteOptions {
    chainId?: string;
    silent?: boolean;
}
