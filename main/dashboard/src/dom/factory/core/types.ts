import type { ClickProp, SubmitProp, InputProp, ChangeProp, KeyProp, FocusProp } from "../event-helpers";
import type { EffectProp } from "../effect-helpers";
import type { ReactiveValue, Disposable } from "../reactive";
import type { MetaTag } from "./semantics/meta-tags.js";

export type Child = HTMLElement | SVGElement | string | Instance<HTMLElement>;

export interface Instance<T extends HTMLElement = HTMLElement> {
    el: T;
    mount(parent: Element): Instance<T>;
    addChild(child: Child): Instance<T>;
    addFirst(child: Child): Instance<T>;
    addBefore(child: Child, ref: Node | null): Instance<T>;
    addBatchBefore(children: readonly Child[], ref: Node | null): Instance<T>;
    detach(): Instance<T>;
    destroy(): void;
    setText(text: ReactiveValue<string>): Instance<T>;
    setHTML(html: ReactiveValue<string>): Instance<T>;
    setAttr(name: string, value: ReactiveValue<string | null>): Instance<T>;
    removeAttr(name: string): Instance<T>;
    setChildren(...children: readonly Child[]): Instance<T>;
    clear(): Instance<T>;
    toggleClass(className: string, force?: boolean): Instance<T>;
    addEffect(name: string): Instance<T>;
    removeEffect(name: string): Instance<T>;
    trackDispose(d: Disposable): Instance<T>;
}

export interface AriaProps {
    ariaLabel?: ReactiveValue<string>;
    ariaLabelledby?: ReactiveValue<string>;
    ariaDescribedby?: ReactiveValue<string>;
    ariaHidden?: ReactiveValue<string>;
    ariaPressed?: ReactiveValue<string>;
    ariaSelected?: ReactiveValue<string>;
    ariaExpanded?: ReactiveValue<string>;
    ariaControls?: ReactiveValue<string>;
    ariaModal?: ReactiveValue<string>;
    ariaLive?: ReactiveValue<string>;
    ariaCurrent?: ReactiveValue<string>;
    ariaInvalid?: ReactiveValue<string>;
    ariaRequired?: ReactiveValue<string>;
    ariaChecked?: ReactiveValue<string>;
    ariaBusy?: ReactiveValue<string>;
    ariaAtomic?: ReactiveValue<string>;
    ariaHaspopup?: ReactiveValue<string>;
}

export interface HtmlAttrProps {
    id?: ReactiveValue<string>;
    type?: ReactiveValue<string>;
    name?: ReactiveValue<string>;
    value?: ReactiveValue<string>;
    placeholder?: ReactiveValue<string>;
    disabled?: ReactiveValue<string>;
    readonly?: ReactiveValue<string>;
    required?: ReactiveValue<string>;
    checked?: ReactiveValue<string>;
    hidden?: ReactiveValue<string>;
    min?: ReactiveValue<string>;
    max?: ReactiveValue<string>;
    step?: ReactiveValue<string>;
    pattern?: ReactiveValue<string>;
    maxlength?: ReactiveValue<string>;
    minlength?: ReactiveValue<string>;
    autocomplete?: ReactiveValue<string>;
    inputmode?: ReactiveValue<string>;
    rows?: ReactiveValue<string>;
    cols?: ReactiveValue<string>;
    href?: ReactiveValue<string>;
    download?: ReactiveValue<string>;
    target?: ReactiveValue<string>;
    rel?: ReactiveValue<string>;
    src?: ReactiveValue<string>;
    alt?: ReactiveValue<string>;
    width?: ReactiveValue<string>;
    height?: ReactiveValue<string>;
    for?: ReactiveValue<string>;
    role?: ReactiveValue<string>;
    tabindex?: ReactiveValue<string>;
    title?: ReactiveValue<string>;
    open?: ReactiveValue<string>;
    multiple?: ReactiveValue<string>;
    selected?: ReactiveValue<string>;
    spellcheck?: ReactiveValue<string>;
    contenteditable?: ReactiveValue<string>;
    draggable?: ReactiveValue<string>;
    form?: ReactiveValue<string>;
    accept?: ReactiveValue<string>;
}

export interface DatasetProps {
    data?: Record<string, ReactiveValue<string>>;
}

export interface ContextProps {
    context?: string | null;
    meta?: readonly MetaTag[] | null;
}

export interface BuildSpec extends AriaProps, HtmlAttrProps, DatasetProps, ContextProps {
    tag: string;
    classes?: readonly string[];
    attrs?: Record<string, ReactiveValue<string>>;
    key?: string;
    text?: ReactiveValue<string>;
    children?: readonly Child[];
    onClick?: ClickProp;
    onDblClick?: ClickProp;
    onSubmit?: SubmitProp;
    onInput?: InputProp;
    onChange?: ChangeProp;
    onKeydown?: KeyProp;
    onKeyup?: KeyProp;
    onKeypress?: KeyProp;
    onBlur?: FocusProp;
    onFocus?: FocusProp;
    effects?: EffectProp | readonly EffectProp[];
}

export interface BaseProps extends AriaProps, HtmlAttrProps, DatasetProps, ContextProps {
    key?: string;
    text?: ReactiveValue<string>;
    classes?: readonly string[];
    attrs?: Record<string, ReactiveValue<string>>;
    onClick?: ClickProp;
    onDblClick?: ClickProp;
    onSubmit?: SubmitProp;
    onInput?: InputProp;
    onChange?: ChangeProp;
    onKeydown?: KeyProp;
    onKeyup?: KeyProp;
    onKeypress?: KeyProp;
    onBlur?: FocusProp;
    onFocus?: FocusProp;
    effects?: EffectProp | readonly EffectProp[];
}

export type Factory = (props?: BaseProps, children?: readonly Child[]) => Instance;
export type AttrEntry = readonly [string, string | undefined];
