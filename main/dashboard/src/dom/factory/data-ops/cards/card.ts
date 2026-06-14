import { build, type BaseProps, type Child, type Instance } from "../../core/index.js";
import type { EffectProp } from "../../effect-helpers.js";

const TAG_DIV = "div";
const CARD_CLASS = "card";
const DEFAULT_EFFECT: EffectProp = { name: "rise", trigger: "intersect", once: true };

function classesFor(classes: readonly string[] | undefined): readonly string[] {
    return classes && classes.length > 0 ? [CARD_CLASS, ...classes] : [CARD_CLASS];
}

function card(props: BaseProps = {}, children: readonly Child[] = []): Instance {
    return build({
        ...props,
        tag: TAG_DIV,
        classes: classesFor(props.classes),
        effects: props.effects ?? DEFAULT_EFFECT,
        children,
    });
}

export { card };
