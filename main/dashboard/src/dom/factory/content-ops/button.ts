import { build, type Instance, type Child, type BaseProps } from "../core";
import { type ClickProp } from "../event-helpers";

const BTN_CLASS = "btn";
const BTN_PRIMARY = "btn--primary";
const BTN_OUTLINE = "btn--outline";
const BTN_COMPACT = "btn--compact";
const BTN_CHIP = "btn-chip";
const TAG_BUTTON = "button";
const TYPE_BUTTON = "button";
const ATTR_TYPE = "type";
const CLASS_LOADING = "is-loading";

const BTN_VARIANT_PRIMARY = "primary";
const BTN_VARIANT_OUTLINE = "outline";
const BTN_VARIANT_CHIP = "chip";
const BTN_VARIANT_BARE = "bare";
const BTN_VARIANT_DEFAULT = "default";

type ButtonVariant =
    | typeof BTN_VARIANT_PRIMARY
    | typeof BTN_VARIANT_OUTLINE
    | typeof BTN_VARIANT_CHIP
    | typeof BTN_VARIANT_BARE
    | typeof BTN_VARIANT_DEFAULT;

const VARIANT_CLASSES: Record<ButtonVariant, readonly string[]> = {
    [BTN_VARIANT_PRIMARY]: [BTN_CLASS, BTN_PRIMARY],
    [BTN_VARIANT_OUTLINE]: [BTN_CLASS, BTN_OUTLINE],
    [BTN_VARIANT_CHIP]: [BTN_CHIP],
    [BTN_VARIANT_BARE]: [],
    [BTN_VARIANT_DEFAULT]: [BTN_CLASS],
};

interface ButtonProps extends BaseProps {
    variant?: ButtonVariant;
    type?: string;
    onClick?: ClickProp;
    busy?: boolean;
    compact?: boolean;
}

function buttonClasses(
    variant: ButtonVariant | undefined,
    extra: readonly string[] | undefined,
    compact: boolean | undefined,
): readonly string[] {
    const base = VARIANT_CLASSES[variant ?? BTN_VARIANT_DEFAULT];
    const withExtra = extra && extra.length > 0 ? [...base, ...extra] : [...base];
    if (compact === true) withExtra.push(BTN_COMPACT);
    return withExtra;
}

function buttonAttrs(props: ButtonProps): Record<string, string> {
    return { [ATTR_TYPE]: props.type ?? TYPE_BUTTON, ...(props.attrs ?? {}) };
}

function button(props: ButtonProps = {}, children: readonly Child[] = []): Instance<HTMLButtonElement> {
    const inst = build<HTMLButtonElement>({
        ...props,
        tag: TAG_BUTTON,
        classes: buttonClasses(props.variant, props.classes, props.compact),
        attrs: buttonAttrs(props),
        children,
    });
    if (props.busy === true) {
        inst.el.classList.add(CLASS_LOADING);
        inst.el.disabled = true;
    }
    return inst;
}

export { button, BTN_VARIANT_PRIMARY, BTN_VARIANT_OUTLINE, BTN_VARIANT_CHIP, BTN_VARIANT_BARE, BTN_VARIANT_DEFAULT };
export type { ButtonProps, ButtonVariant };
