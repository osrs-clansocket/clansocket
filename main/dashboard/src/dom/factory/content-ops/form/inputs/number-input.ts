import { build, type BaseProps, type Instance } from "../../../core";
import { TAG_INPUT, bindFormValue } from "../shared.js";

const INPUT_TYPE_NUMBER = "number";

export type NumberInputProps = BaseProps;

export function numberInput(props: NumberInputProps = {}): Instance<HTMLInputElement> {
    const { value, ...rest } = props;
    const inst = build<HTMLInputElement>({
        tag: TAG_INPUT,
        ...rest,
        type: INPUT_TYPE_NUMBER,
    });
    if (value !== undefined) bindFormValue(inst, value);
    return inst;
}
