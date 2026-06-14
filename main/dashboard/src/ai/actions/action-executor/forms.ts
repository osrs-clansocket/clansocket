import type { CheckOp, PressKeyOp, SelectOptionOp, SetValueOp, ToggleOpenOp } from "../action-types.js";
import {
    ERR_NOT_CHECKABLE,
    ERR_NOT_DETAILS,
    ERR_NOT_FORM,
    ERR_NOT_FORM_CONTROL,
    ERR_NOT_SELECT,
    VERB_BLUR,
    VERB_CHECK,
    VERB_CLICK,
    VERB_FOCUS,
    VERB_PRESS_KEY,
    VERB_SELECT_OPTION,
    VERB_SET_VALUE,
    VERB_SUBMIT,
    VERB_TOGGLE_OPEN,
} from "./constants.js";
import { dispatchBubbling, fail, isFormControl, makeElementAction, makeInstanceAction, ok } from "./helpers.js";

const EV_INPUT = "input";
const EV_CHANGE = "change";
const INPUT_TYPE_CHECKBOX = "checkbox";
const INPUT_TYPE_RADIO = "radio";

const keyIdentity = (key: string): string => key;
const targetOf = <T extends { target: string }>(op: T): string => op.target;

export const doClick = makeElementAction(VERB_CLICK, keyIdentity, (el, key) => {
    try {
        el.click();
        return ok(VERB_CLICK, key);
    } catch (err) {
        return fail(VERB_CLICK, key, (err as Error).message);
    }
});

export const doSetValue = makeElementAction(VERB_SET_VALUE, targetOf, (el, op: SetValueOp) => {
    if (!isFormControl(el)) return fail(VERB_SET_VALUE, op.target, ERR_NOT_FORM_CONTROL);
    el.value = op.value;
    dispatchBubbling(el, EV_INPUT);
    dispatchBubbling(el, EV_CHANGE);
    return ok(VERB_SET_VALUE, op.target, { value: op.value });
});

export const doCheck = makeInstanceAction({
    verb: VERB_CHECK,
    getKey: targetOf,
    ctor: HTMLInputElement,
    err: ERR_NOT_CHECKABLE,
    handler: (input, op: CheckOp) => {
        if (input.type !== INPUT_TYPE_CHECKBOX && input.type !== INPUT_TYPE_RADIO) {
            return fail(VERB_CHECK, op.target, ERR_NOT_CHECKABLE);
        }
        input.checked = op.checked;
        dispatchBubbling(input, EV_CHANGE);
        return ok(VERB_CHECK, op.target, { checked: op.checked });
    },
});

export const doSelectOption = makeInstanceAction({
    verb: VERB_SELECT_OPTION,
    getKey: targetOf,
    ctor: HTMLSelectElement,
    err: ERR_NOT_SELECT,
    handler: (sel, op: SelectOptionOp) => {
        sel.value = op.value;
        dispatchBubbling(sel, EV_CHANGE);
        return ok(VERB_SELECT_OPTION, op.target, { value: op.value });
    },
});

export const doSubmit = makeInstanceAction({
    verb: VERB_SUBMIT,
    getKey: keyIdentity,
    ctor: HTMLFormElement,
    err: ERR_NOT_FORM,
    handler: (form, key) => {
        try {
            form.requestSubmit();
            return ok(VERB_SUBMIT, key);
        } catch (err) {
            return fail(VERB_SUBMIT, key, (err as Error).message);
        }
    },
});

export const doFocus = makeElementAction(VERB_FOCUS, keyIdentity, (el, key) => {
    el.focus();
    return ok(VERB_FOCUS, key);
});

export const doBlur = makeElementAction(VERB_BLUR, keyIdentity, (el, key) => {
    el.blur();
    return ok(VERB_BLUR, key);
});

export const doPressKey = makeElementAction(VERB_PRESS_KEY, targetOf, (el, op: PressKeyOp) => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: op.key, bubbles: true }));
    return ok(VERB_PRESS_KEY, op.target, { key: op.key });
});

export const doToggleOpen = makeInstanceAction({
    verb: VERB_TOGGLE_OPEN,
    getKey: targetOf,
    ctor: HTMLDetailsElement,
    err: ERR_NOT_DETAILS,
    handler: (details, op: ToggleOpenOp) => {
        details.open = op.open;
        return ok(VERB_TOGGLE_OPEN, op.target, { open: op.open });
    },
});
