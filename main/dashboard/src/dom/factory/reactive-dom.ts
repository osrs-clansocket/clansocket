import { effect, isSignal, type EffectOwner, type ReactiveValue, type ReadSignal } from "./reactive.js";
import { scheduleText as schedText, scheduleHtml as schedHtml, scheduleAttr as schedAttr } from "./scheduler";
import { trustHTML } from "./core/trust-html.js";

export function writeText(el: HTMLElement, value: ReactiveValue<string>, owner: EffectOwner): void {
    if (isSignal(value)) {
        owner.trackDispose(
            effect(() => {
                const v = (value as ReadSignal<string>)();
                if (el.isConnected) schedText(el, v);
                else el.textContent = v;
            }),
        );
        return;
    }
    el.textContent = value;
}

export function writeHTML(el: HTMLElement, value: ReactiveValue<string>, owner: EffectOwner): void {
    if (isSignal(value)) {
        owner.trackDispose(
            effect(() => {
                const v = (value as ReadSignal<string>)();
                if (el.isConnected) schedHtml(el, v);
                else el.innerHTML = trustHTML(v) as string;
            }),
        );
        return;
    }
    el.innerHTML = trustHTML(value) as string;
}

export function writeAttr(
    el: HTMLElement,
    name: string,
    value: ReactiveValue<string | null>,
    owner: EffectOwner,
): void {
    if (isSignal(value)) {
        owner.trackDispose(
            effect(() => {
                const v = (value as ReadSignal<string | null>)();
                if (el.isConnected) schedAttr(el, name, v);
                else if (v === null) el.removeAttribute(name);
                else el.setAttribute(name, v);
            }),
        );
        return;
    }
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
}

export function applyText(el: HTMLElement, text: ReactiveValue<string> | undefined, owner: EffectOwner): void {
    if (text === undefined) return;
    writeText(el, text, owner);
}

export function applyAttrs(
    el: HTMLElement,
    attrs: Record<string, ReactiveValue<string>> | undefined,
    owner: EffectOwner,
): void {
    if (!attrs) return;
    for (const [k, v] of Object.entries(attrs)) writeAttr(el, k, v, owner);
}
