import { build } from "./build.js";
import type { AttrEntry, Child, Factory, Instance } from "./types.js";

const TAG_DIV = "div";

export function buildAttrs(entries: readonly AttrEntry[]): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const [k, v] of entries) if (v !== undefined) attrs[k] = v;
    return attrs;
}

export function joinClasses(base: string, extra: readonly string[] | undefined): readonly string[] {
    return extra && extra.length > 0 ? [base, ...extra] : [base];
}

export function resolveClasses(
    baseClass: string | null,
    extra: readonly string[] | undefined,
): readonly string[] | undefined {
    if (baseClass) return joinClasses(baseClass, extra);
    return extra;
}

export function primitive(tag: string, baseClass: string | null = null): Factory {
    return (props = {}, children = []) =>
        build({
            ...props,
            tag,
            classes: resolveClasses(baseClass, props.classes),
            children,
        });
}

export function keyedDiv(cls: string, key: string, children: readonly Child[] = []): Instance {
    return build({ tag: TAG_DIV, classes: [cls], key, children });
}

export function keyedDivWithAttrs(
    cls: string,
    key: string,
    attrs: Record<string, string>,
    children: readonly Child[] = [],
): Instance {
    return build({ tag: TAG_DIV, classes: [cls], key, attrs, children });
}
