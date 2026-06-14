import { build, type BaseProps, type Instance } from "../../../core";
import { TAG_INPUT } from "../shared.js";

const INPUT_TYPE_RADIO = "radio";

export interface RadioProps extends BaseProps {
    group: string;
}

export function radio(props: RadioProps): Instance<HTMLInputElement> {
    const { group, ...rest } = props;
    return build<HTMLInputElement>({
        tag: TAG_INPUT,
        ...rest,
        type: INPUT_TYPE_RADIO,
        name: rest.name ?? group,
    });
}
