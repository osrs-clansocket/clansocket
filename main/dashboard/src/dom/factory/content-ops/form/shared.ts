import { effect, isSignal, type ReactiveValue, type ReadSignal } from "../../reactive.js";
import type { Instance } from "../../core";

export const TAG_INPUT = "input";
export const TAG_LABEL = "label";
export const TAG_FORM = "form";
export const TAG_TEXTAREA = "textarea";
export const TAG_SELECT = "select";
export const TAG_OPTION = "option";
export const ATTR_ROWS = "rows";
export const DEFAULT_INPUT_TYPE = "text";
export const ATTR_TYPE = "type";
export const ATTR_NAME = "name";
export const ATTR_PLACEHOLDER = "placeholder";
export const ATTR_VALUE = "value";
export const ATTR_MAXLENGTH = "maxlength";
export const ATTR_FOR = "for";
export const ATTR_SELECTED = "selected";

export function asStr(n: number | undefined): string | undefined {
    return n === undefined ? undefined : String(n);
}

export function mergeAttrs(
    base: Record<string, string>,
    extra: Record<string, string> | undefined,
): Record<string, string> {
    return extra ? { ...base, ...extra } : base;
}

export function bindFormValue<T extends HTMLInputElement | HTMLTextAreaElement>(
    inst: Instance<T>,
    value: ReactiveValue<string>,
): void {
    if (isSignal(value)) {
        inst.trackDispose(
            effect(() => {
                const v = (value as ReadSignal<string>)();
                if (inst.el.value !== v) inst.el.value = v;
            }),
        );
        return;
    }
    inst.el.value = value;
}
