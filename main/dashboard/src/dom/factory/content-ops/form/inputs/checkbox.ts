import { build, type BaseProps, type Instance } from "../../../core";
import { TAG_INPUT } from "../shared.js";

const INPUT_TYPE_CHECKBOX = "checkbox";

export type CheckboxProps = BaseProps;

export function checkbox(props: CheckboxProps = {}): Instance<HTMLInputElement> {
    return build<HTMLInputElement>({
        tag: TAG_INPUT,
        ...props,
        type: INPUT_TYPE_CHECKBOX,
    });
}
