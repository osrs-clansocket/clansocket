import { executeActions } from "../../../ai/actions/action-executor";
import type { Actions, CheckOp, SelectOptionOp, SetValueOp } from "../../../ai/actions/action-types";

const CLONE_KEY_ATTR = "data-ai-clone";
const CLONE_SELECTOR = `[${CLONE_KEY_ATTR}]`;
const TYPE_CHECKBOX = "checkbox";
const TYPE_RADIO = "radio";
const FORWARDED_KEYS: ReadonlySet<string> = new Set([
    "Enter",
    "Escape",
    "Tab",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
]);

function getCloneKey(el: Element): string | null {
    const clone = el.closest(CLONE_SELECTOR);
    if (clone === null) return null;
    const key = clone.getAttribute(CLONE_KEY_ATTR);
    return key !== null && key.length > 0 ? key : null;
}

function withClone(target: EventTarget | null, fn: (el: Element, key: string) => void): void {
    if (!(target instanceof Element)) return;
    const key = getCloneKey(target);
    if (key === null) return;
    fn(target, key);
}

function isToggleable(el: Element): el is HTMLInputElement {
    if (!(el instanceof HTMLInputElement)) return false;
    return el.type === TYPE_CHECKBOX || el.type === TYPE_RADIO;
}

function isTextInput(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
    if (el instanceof HTMLTextAreaElement) return true;
    if (!(el instanceof HTMLInputElement)) return false;
    return el.type !== TYPE_CHECKBOX && el.type !== TYPE_RADIO;
}

function syncInputState(el: HTMLElement, key: string): void {
    if (isToggleable(el)) {
        void executeActions({ check: [{ target: key, checked: el.checked }] });
        return;
    }
    if (el instanceof HTMLSelectElement) {
        void executeActions({ selectOption: [{ target: key, value: el.value }] });
        return;
    }
    if (isTextInput(el)) {
        void executeActions({ setValue: [{ target: key, value: el.value }] });
    }
}

function buildSyncActions(form: HTMLFormElement): Actions {
    const setValue: SetValueOp[] = [];
    const check: CheckOp[] = [];
    const selectOption: SelectOptionOp[] = [];
    for (const el of form.querySelectorAll<HTMLElement>(CLONE_SELECTOR)) {
        const key = el.getAttribute(CLONE_KEY_ATTR);
        if (key === null || key.length === 0) continue;
        if (isToggleable(el)) check.push({ target: key, checked: el.checked });
        else if (el instanceof HTMLSelectElement) selectOption.push({ target: key, value: el.value });
        else if (isTextInput(el)) setValue.push({ target: key, value: el.value });
    }
    return { setValue, check, selectOption };
}

function wireClick(history: HTMLElement): void {
    history.addEventListener("click", (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        withClone(target, (_el, key) => {
            event.preventDefault();
            void executeActions({ click: key });
        });
    });
}

function wireChange(history: HTMLElement): void {
    history.addEventListener("change", (event: Event) => {
        withClone(event.target, (el, key) => {
            if (!(el instanceof HTMLElement)) return;
            syncInputState(el, key);
        });
    });
}

function wireSubmit(history: HTMLElement): void {
    history.addEventListener("submit", (event: Event) => {
        withClone(event.target, (el, key) => {
            if (!(el instanceof HTMLFormElement)) return;
            event.preventDefault();
            void executeActions(buildSyncActions(el), { silent: true });
            void executeActions({ submit: key });
        });
    });
}

function wireKeydown(history: HTMLElement): void {
    history.addEventListener("keydown", (event: KeyboardEvent) => {
        if (!FORWARDED_KEYS.has(event.key)) return;
        withClone(event.target, (el, key) => {
            if (event.key === "Enter" && el instanceof HTMLElement) {
                syncInputState(el, key);
            }
            void executeActions({ pressKey: [{ target: key, key: event.key }] });
        });
    });
}

function wireToggle(history: HTMLElement): void {
    history.addEventListener(
        "toggle",
        (event: Event) => {
            withClone(event.target, (el, key) => {
                if (!(el instanceof HTMLDetailsElement)) return;
                void executeActions({ toggleOpen: [{ target: key, open: el.open }] });
            });
        },
        true,
    );
}

function wireCloneEvents(history: HTMLElement): void {
    wireClick(history);
    wireChange(history);
    wireSubmit(history);
    wireKeydown(history);
    wireToggle(history);
}

export { wireCloneEvents };
