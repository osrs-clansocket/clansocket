export interface AiMessage {
    role: "user" | "assistant";
    content: string;
}

export interface SetValueOp {
    target: string;
    value: string;
}

export interface CheckOp {
    target: string;
    checked: boolean;
}

export interface SelectOptionOp {
    target: string;
    value: string;
}

export interface PressKeyOp {
    target: string;
    key: string;
}

export interface ToggleOpenOp {
    target: string;
    open: boolean;
}

export interface Actions {
    navigate?: string;
    highlight?: string[];
    show?: string;
    route?: string;
    click?: string;
    setValue?: SetValueOp[];
    check?: CheckOp[];
    selectOption?: SelectOptionOp[];
    submit?: string;
    focus?: string;
    blur?: string;
    pressKey?: PressKeyOp[];
    toggleOpen?: ToggleOpenOp[];
}

export interface ActionResult {
    verb: string;
    target: string | null;
    success: boolean;
    error?: string;
    meta?: Record<string, unknown>;
}
