import { textarea, type TextareaProps, type Instance } from "../../../factory/index.js";
import { FORM_INPUT } from "../../form-classes.js";

export type GlassTextareaProps = TextareaProps;

export function glassTextarea(props: GlassTextareaProps = {}): Instance<HTMLTextAreaElement> {
    const userClasses = props.classes ?? [];
    return textarea({
        ...props,
        classes: [FORM_INPUT, ...userClasses],
    });
}
