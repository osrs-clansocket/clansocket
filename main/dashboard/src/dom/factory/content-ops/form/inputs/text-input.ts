import { build, type BaseProps, type Instance } from "../../../core";
import { TAG_INPUT, bindFormValue } from "../shared.js";

const INPUT_TYPE_TEXT = "text";

export type TextInputProps = BaseProps;

export function textInput(props: TextInputProps = {}): Instance<HTMLInputElement> {
    const { value, ...rest } = props;
    const inst = build<HTMLInputElement>({
        tag: TAG_INPUT,
        ...rest,
        type: INPUT_TYPE_TEXT,
    });
    if (value !== undefined) bindFormValue(inst, value);
    return inst;
}
