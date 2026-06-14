import { addEffectClass, removeEffectClass } from "../effect-helpers";
import { type Disposable } from "../reactive";
import { writeAttr, writeHTML, writeText } from "../reactive-dom";
import type { Child, Instance } from "./types.js";

export function toNode(child: Child): Node {
    if (typeof child === "string") return document.createTextNode(child);
    if (child instanceof Element) return child;
    return child.el;
}

export function chain<T>(self: T, op: () => void): T {
    op();
    return self;
}

export function createInstance<T extends HTMLElement>(el: T): Instance<T> {
    const disposers: Disposable[] = [];
    const self: Instance<T> = {
        el,
        mount: (parent) => chain(self, () => parent.appendChild(el)),
        addChild: (child) => chain(self, () => el.appendChild(toNode(child))),
        addFirst: (child) => chain(self, () => el.insertBefore(toNode(child), el.firstChild)),
        addBefore: (child, ref) => chain(self, () => el.insertBefore(toNode(child), ref)),
        addBatchBefore: (children, ref) =>
            chain(self, () => {
                if (children.length === 0) return;
                const frag = document.createDocumentFragment();
                for (const child of children) frag.appendChild(toNode(child));
                el.insertBefore(frag, ref);
            }),
        detach: () => chain(self, () => el.remove()),
        destroy: () => {
            for (const d of disposers) d.dispose();
            disposers.length = 0;
            el.remove();
        },
        setText: (text) => chain(self, () => writeText(el, text, self)),
        setHTML: (html) => chain(self, () => writeHTML(el, html, self)),
        setAttr: (name, value) => chain(self, () => writeAttr(el, name, value, self)),
        removeAttr: (name) => chain(self, () => el.removeAttribute(name)),
        setChildren: (...children) =>
            chain(self, () => {
                el.replaceChildren();
                for (const child of children) el.appendChild(toNode(child));
            }),
        clear: () => chain(self, () => el.replaceChildren()),
        toggleClass: (className, force) =>
            chain(self, () => {
                el.classList.toggle(className, force);
            }),
        addEffect: (name) => chain(self, () => addEffectClass(el, name)),
        removeEffect: (name) => chain(self, () => removeEffectClass(el, name)),
        trackDispose: (d) =>
            chain(self, () => {
                disposers.push(d);
            }),
    };
    return self;
}
