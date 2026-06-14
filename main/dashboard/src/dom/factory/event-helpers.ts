const GATE_MS = 100;
const ERROR_FLASH_MS = 1000;
const CLASS_LOADING = "is-loading";
const CLASS_ERROR_FLASH = "btn--error-flash";

let lastClickAt = 0;

function passesClickGate(): boolean {
    const now = performance.now();
    if (now - lastClickAt < GATE_MS) return false;
    lastClickAt = now;
    return true;
}

function clearSelection(): void {
    window.getSelection()?.removeAllRanges();
}

function flashError(el: HTMLElement): void {
    el.classList.add(CLASS_ERROR_FLASH);
    window.setTimeout(() => el.classList.remove(CLASS_ERROR_FLASH), ERROR_FLASH_MS);
}

function trackAsync<T>(el: HTMLButtonElement | HTMLFormElement, promise: Promise<T>): Promise<T> {
    el.classList.add(CLASS_LOADING);
    if ("disabled" in el) (el as HTMLButtonElement).disabled = true;
    return promise.then(
        (v) => {
            el.classList.remove(CLASS_LOADING);
            if ("disabled" in el) (el as HTMLButtonElement).disabled = false;
            return v;
        },
        (err) => {
            el.classList.remove(CLASS_LOADING);
            if ("disabled" in el) (el as HTMLButtonElement).disabled = false;
            flashError(el);
            throw err;
        },
    );
}

export type ClickHandler = (e: MouseEvent) => void | Promise<void>;
export type SubmitHandler = (e: SubmitEvent) => void | Promise<void>;
export type InputHandler = (e: Event) => void;
export type ChangeHandler = (e: Event) => void;
export type KeyHandler = (e: KeyboardEvent) => void;
export type FocusHandler = (e: FocusEvent) => void;

export interface HandlerDescriptor<T> {
    handler: T;
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
    raw?: boolean;
}

export type ClickProp = ClickHandler | HandlerDescriptor<ClickHandler>;
export type SubmitProp = SubmitHandler | HandlerDescriptor<SubmitHandler>;
export type InputProp = InputHandler | HandlerDescriptor<InputHandler>;
export type ChangeProp = ChangeHandler | HandlerDescriptor<ChangeHandler>;
export type KeyProp = KeyHandler | HandlerDescriptor<KeyHandler>;
export type FocusProp = FocusHandler | HandlerDescriptor<FocusHandler>;

function isDescriptor<T>(prop: T | HandlerDescriptor<T>): prop is HandlerDescriptor<T> {
    return typeof prop === "object" && prop !== null && "handler" in prop;
}

function pickOptions<T>(d: HandlerDescriptor<T>): AddEventListenerOptions {
    const options: AddEventListenerOptions = {};
    if (d.capture !== undefined) options.capture = d.capture;
    if (d.once !== undefined) options.once = d.once;
    if (d.passive !== undefined) options.passive = d.passive;
    return options;
}

function resolveProp<T>(prop: T | HandlerDescriptor<T>): {
    handler: T;
    options: AddEventListenerOptions;
    raw: boolean;
} {
    if (isDescriptor(prop)) return { handler: prop.handler, options: pickOptions(prop), raw: prop.raw === true };
    return { handler: prop, options: {}, raw: false };
}

function runGuarded<E extends Event>(
    el: HTMLButtonElement | HTMLFormElement,
    e: E,
    handler: (e: E) => void | Promise<void>,
): void {
    clearSelection();
    const result = handler(e);
    if (result instanceof Promise) void trackAsync(el, result).catch(() => undefined);
}

export function wireClick(el: HTMLElement, prop: ClickProp): void {
    const { handler, options, raw } = resolveProp(prop);
    if (raw) {
        el.addEventListener("click", handler as EventListener, options);
        return;
    }
    el.addEventListener(
        "click",
        (e: MouseEvent) => {
            if (!passesClickGate()) {
                e.stopImmediatePropagation();
                e.preventDefault();
                return;
            }
            runGuarded(el as HTMLButtonElement, e, handler);
        },
        options,
    );
}

export function wireSubmit(el: HTMLFormElement, prop: SubmitProp): void {
    const { handler, options, raw } = resolveProp(prop);
    if (raw) {
        el.addEventListener("submit", handler as EventListener, options);
        return;
    }
    el.addEventListener(
        "submit",
        (e: SubmitEvent) => {
            e.preventDefault();
            if (!passesClickGate()) return;
            runGuarded(el, e, handler);
        },
        options,
    );
}

function wireSimple<T>(el: HTMLElement, evt: string, prop: T | HandlerDescriptor<T>): void {
    const { handler, options } = resolveProp(prop);
    el.addEventListener(evt, handler as EventListener, options);
}

export function wireInput(el: HTMLElement, prop: InputProp): void {
    wireSimple(el, "input", prop);
}

export function wireChange(el: HTMLElement, prop: ChangeProp): void {
    wireSimple(el, "change", prop);
}

export function wireKey(el: HTMLElement, evt: "keydown" | "keyup" | "keypress", prop: KeyProp): void {
    wireSimple(el, evt, prop);
}

export function wireFocus(el: HTMLElement, evt: "focus" | "blur", prop: FocusProp): void {
    wireSimple(el, evt, prop);
}

export function wireDblClick(el: HTMLElement, prop: ClickProp): void {
    wireSimple(el, "dblclick", prop);
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
    let timer: number | undefined;
    return ((...args: Parameters<T>) => {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), ms);
    }) as T;
}
