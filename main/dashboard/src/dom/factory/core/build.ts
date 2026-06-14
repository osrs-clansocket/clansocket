import { wireChange, wireClick, wireDblClick, wireFocus, wireInput, wireKey, wireSubmit } from "../event-helpers";
import { applyEffects } from "../effect-helpers";
import type { ReactiveValue } from "../reactive";
import { applyAttrs, applyText } from "../reactive-dom";
import { autoKeyFor } from "./auto-key.js";
import { createInstance } from "./instance.js";
import type { BuildSpec, Child, Instance } from "./types.js";

const ARIA_PROP_TO_ATTR: Record<string, string> = {
    ariaLabel: "aria-label",
    ariaLabelledby: "aria-labelledby",
    ariaDescribedby: "aria-describedby",
    ariaHidden: "aria-hidden",
    ariaPressed: "aria-pressed",
    ariaSelected: "aria-selected",
    ariaExpanded: "aria-expanded",
    ariaControls: "aria-controls",
    ariaModal: "aria-modal",
    ariaLive: "aria-live",
    ariaCurrent: "aria-current",
    ariaInvalid: "aria-invalid",
    ariaRequired: "aria-required",
    ariaChecked: "aria-checked",
    ariaBusy: "aria-busy",
    ariaAtomic: "aria-atomic",
    ariaHaspopup: "aria-haspopup",
};

const HTML_ATTR_PROPS = [
    "id",
    "type",
    "name",
    "value",
    "placeholder",
    "disabled",
    "readonly",
    "required",
    "checked",
    "hidden",
    "min",
    "max",
    "step",
    "pattern",
    "maxlength",
    "minlength",
    "autocomplete",
    "inputmode",
    "rows",
    "cols",
    "href",
    "download",
    "target",
    "rel",
    "src",
    "alt",
    "width",
    "height",
    "for",
    "role",
    "tabindex",
    "title",
    "open",
    "multiple",
    "selected",
    "spellcheck",
    "contenteditable",
    "draggable",
    "form",
    "accept",
] as const;

function applyClasses(el: HTMLElement, classes: readonly string[] | undefined): void {
    if (classes && classes.length > 0) el.classList.add(...classes);
}

function applyKey(el: HTMLElement, key: string | undefined, spec: BuildSpec): void {
    const finalKey = key ?? autoKeyFor(spec);
    if (finalKey) {
        el.dataset.key = finalKey;
        el.dataset.auditTarget = finalKey;
    }
}

function applyContext(el: HTMLElement, spec: BuildSpec): void {
    if (spec.context) el.dataset.context = spec.context;
    if (spec.meta && spec.meta.length > 0) el.dataset.meta = spec.meta.join(" ");
}

function mergedAttrs(spec: BuildSpec): Record<string, ReactiveValue<string>> | undefined {
    const specRecord = spec as unknown as Record<string, ReactiveValue<string> | undefined>;
    let merged: Record<string, ReactiveValue<string>> | undefined;

    const ensure = (): Record<string, ReactiveValue<string>> => {
        if (!merged) merged = spec.attrs ? { ...spec.attrs } : {};
        return merged;
    };

    for (const propName of Object.keys(ARIA_PROP_TO_ATTR)) {
        const value = specRecord[propName];
        if (value !== undefined) ensure()[ARIA_PROP_TO_ATTR[propName]!] = value;
    }
    for (const attrName of HTML_ATTR_PROPS) {
        const value = specRecord[attrName];
        if (value !== undefined) ensure()[attrName] = value;
    }
    if (spec.data) {
        const target = ensure();
        for (const [k, v] of Object.entries(spec.data)) target[`data-${k}`] = v;
    }

    return merged ?? spec.attrs;
}

export function build<T extends HTMLElement>(spec: BuildSpec, children?: readonly Child[]): Instance<T> {
    const el = document.createElement(spec.tag) as T;
    const inst = createInstance<T>(el);
    applyClasses(el, spec.classes);
    applyAttrs(el, mergedAttrs(spec), inst);
    applyKey(el, spec.key, spec);
    applyContext(el, spec);
    applyText(el, spec.text, inst);
    if (spec.children) for (const child of spec.children) inst.addChild(child);
    if (children) for (const child of children) inst.addChild(child);
    if (spec.onClick) wireClick(el, spec.onClick);
    if (spec.onDblClick) wireDblClick(el, spec.onDblClick);
    if (spec.onSubmit) wireSubmit(el as unknown as HTMLFormElement, spec.onSubmit);
    if (spec.onInput) wireInput(el, spec.onInput);
    if (spec.onChange) wireChange(el, spec.onChange);
    if (spec.onKeydown) wireKey(el, "keydown", spec.onKeydown);
    if (spec.onKeyup) wireKey(el, "keyup", spec.onKeyup);
    if (spec.onKeypress) wireKey(el, "keypress", spec.onKeypress);
    if (spec.onBlur) wireFocus(el, "blur", spec.onBlur);
    if (spec.onFocus) wireFocus(el, "focus", spec.onFocus);
    if (spec.effects !== undefined) applyEffects(el, spec.effects);
    return inst;
}
