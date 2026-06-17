import { input, type InputProps, type Instance } from "../../../factory/index.js";
import { FORM_INPUT } from "../../form-classes.js";

export type GlassInputProps = Omit<InputProps, "type">;

export function glassInput(props: GlassInputProps = {}): Instance<HTMLInputElement> {
    const userClasses = props.classes ?? [];
    return input({
        ...props,
        type: "text",
        classes: [FORM_INPUT, ...userClasses],
    });
}
