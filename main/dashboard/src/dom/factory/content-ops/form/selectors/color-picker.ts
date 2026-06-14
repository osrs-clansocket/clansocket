import { build, type BaseProps, type Instance } from "../../../core";
import { TAG_INPUT, bindFormValue } from "../shared.js";

const INPUT_TYPE_COLOR = "color";

export type ColorPickerProps = BaseProps;

export function colorPicker(props: ColorPickerProps = {}): Instance<HTMLInputElement> {
    const { value, ...rest } = props;
    const inst = build<HTMLInputElement>({
        tag: TAG_INPUT,
        ...rest,
        type: INPUT_TYPE_COLOR,
    });
    if (value !== undefined) bindFormValue(inst, value);
    return inst;
}
