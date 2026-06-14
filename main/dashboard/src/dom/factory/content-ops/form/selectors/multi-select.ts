import { build, type BaseProps, type Instance } from "../../../core";
import { TAG_SELECT } from "../shared.js";

const ATTR_MULTIPLE = "multiple";

export type MultiSelectProps = BaseProps;

export function multiSelect(props: MultiSelectProps = {}): Instance<HTMLSelectElement> {
    return build<HTMLSelectElement>({
        tag: TAG_SELECT,
        ...props,
        multiple: ATTR_MULTIPLE,
    });
}
