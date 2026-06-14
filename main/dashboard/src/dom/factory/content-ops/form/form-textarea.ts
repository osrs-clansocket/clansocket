import { build, type BaseProps, type Child, type Instance } from "../../core";
import { TAG_FORM, TAG_TEXTAREA, bindFormValue } from "./shared.js";

export function form(props: BaseProps = {}, children: readonly Child[] = []): Instance<HTMLFormElement> {
    return build<HTMLFormElement>({
        tag: TAG_FORM,
        ...props,
        children,
    });
}

export type TextareaProps = BaseProps;

export function textarea(props: TextareaProps = {}): Instance<HTMLTextAreaElement> {
    const { value, ...rest } = props;
    const inst = build<HTMLTextAreaElement>({
        tag: TAG_TEXTAREA,
        ...rest,
    });
    if (value !== undefined) bindFormValue(inst, value);
    return inst;
}
