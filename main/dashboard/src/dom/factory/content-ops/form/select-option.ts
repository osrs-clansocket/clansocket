import { build, type BaseProps, type Child, type Instance } from "../../core";
import { TAG_OPTION, TAG_SELECT } from "./shared.js";

export type SelectProps = BaseProps;
export type OptionProps = BaseProps;

export function select(props: SelectProps = {}, children: readonly Child[] = []): Instance<HTMLSelectElement> {
    const inst = build<HTMLSelectElement>({
        tag: TAG_SELECT,
        ...props,
        children,
    });
    if (typeof props.value === "string") inst.el.value = props.value;
    return inst;
}

export function option(props: OptionProps = {}, children: readonly Child[] = []): Instance<HTMLOptionElement> {
    return build<HTMLOptionElement>({
        tag: TAG_OPTION,
        ...props,
        children,
    });
}
