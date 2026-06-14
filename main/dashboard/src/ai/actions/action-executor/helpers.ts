import { DEDUP_SEP, type ActionResult } from "../action-types.js";
import { ERR_NOT_FOUND } from "./constants.js";

const BUBBLE_OPTS = { bubbles: true } as const;

export function findByKey(key: string): HTMLElement | null {
    const sep = key.lastIndexOf(DEDUP_SEP);
    if (sep > 0) {
        const n = Number(key.slice(sep + 1));
        if (Number.isInteger(n) && n >= 1) {
            const base = key.slice(0, sep);
            return document.querySelectorAll<HTMLElement>(`[data-key="${base}"]`)[n - 1] ?? null;
        }
    }
    return document.querySelector<HTMLElement>(`[data-key="${key}"]`);
}

export function withFoundElement(key: string, verb: string, body: (el: HTMLElement) => ActionResult): ActionResult {
    const el = findByKey(key);
    if (!el) return fail(verb, key, ERR_NOT_FOUND);
    return body(el);
}

export function makeElementAction<TArg>(
    verb: string,
    getKey: (arg: TArg) => string,
    handler: (el: HTMLElement, arg: TArg) => ActionResult,
): (arg: TArg) => ActionResult {
    return (arg) => withFoundElement(getKey(arg), verb, (el) => handler(el, arg));
}

export function whenInstance<T extends HTMLElement, R>(
    el: HTMLElement,
    ctor: abstract new (...args: never[]) => T,
    onOk: (typedEl: T) => R,
    onFail: () => R,
): R {
    return el instanceof ctor ? onOk(el as T) : onFail();
}

export interface InstanceActionSpec<TArg, E extends HTMLElement> {
    verb: string;
    getKey: (arg: TArg) => string;
    ctor: abstract new (...args: never[]) => E;
    err: string;
    handler: (el: E, arg: TArg) => ActionResult;
}

export function makeInstanceAction<TArg, E extends HTMLElement>({
    verb,
    getKey,
    ctor,
    err,
    handler,
}: InstanceActionSpec<TArg, E>): (arg: TArg) => ActionResult {
    return makeElementAction(verb, getKey, (el, arg) =>
        whenInstance(
            el,
            ctor,
            (typed) => handler(typed, arg),
            () => fail(verb, getKey(arg), err),
        ),
    );
}

export function dispatchBubbling(el: HTMLElement, type: string): void {
    el.dispatchEvent(new Event(type, BUBBLE_OPTS));
}

export function ok(verb: string, target: string | null, meta?: Record<string, unknown>): ActionResult {
    const r: ActionResult = { verb, target, success: true };
    if (meta) r.meta = meta;
    return r;
}

export function fail(verb: string, target: string | null, error: string): ActionResult {
    return { verb, target, success: false, error };
}

export function isFormControl(el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}
