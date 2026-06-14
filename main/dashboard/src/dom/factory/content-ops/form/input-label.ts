import { build, type BaseProps, type Child, type Instance } from "../../core";
import { DEFAULT_INPUT_TYPE, TAG_INPUT, TAG_LABEL, bindFormValue } from "./shared.js";

export type InputProps = BaseProps;

export interface LabelProps extends BaseProps {
    htmlFor?: string;
}

export function input(props: InputProps = {}): Instance<HTMLInputElement> {
    const { value, ...rest } = props;
    const inst = build<HTMLInputElement>({
        tag: TAG_INPUT,
        ...rest,
        type: rest.type ?? DEFAULT_INPUT_TYPE,
    });
    if (value !== undefined) bindFormValue(inst, value);
    return inst;
}

export function label(props: LabelProps = {}, children: readonly Child[] = []): Instance<HTMLLabelElement> {
    const { htmlFor, ...rest } = props;
    return build<HTMLLabelElement>({
        tag: TAG_LABEL,
        ...rest,
        for: htmlFor ?? props.for,
        children,
    });
}
