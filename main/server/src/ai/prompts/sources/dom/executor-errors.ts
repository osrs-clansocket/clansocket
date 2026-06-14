export interface ExecutorError {
    readonly code: string;
    readonly meaning: string;
    readonly recovery: string;
}

function err(code: string, meaning: string, recovery: string): ExecutorError {
    return { code, meaning, recovery };
}

export const EXECUTOR_ERRORS: readonly ExecutorError[] = [
    err(
        "element-not-found",
        "the data-key isnt in the dom",
        "read fresh pageState — element may be hidden, removed, or never existed",
    ),
    err("not-form-control", "setValue/check on non-input", "find the actual input's data-key in pageState"),
    err("not-checkable", "check on input that isnt checkbox/radio", "use setValue if its a text-like input"),
    err("not-select", "selectOption on non-select", "use setValue if its a free-form input"),
    err("not-form", "submit on non-form", "find the form's data-key, or `click` a submit button instead"),
    err("not-details", "toggleOpen on non-`<details>`", "use click if it's a custom collapsible"),
    err(
        "skipped-route-precedence",
        "u emitted route + other verbs in same turn — only route fired",
        "next turn, see the new pageState + emit the deferred verbs against real keys on the new page",
    ),
];
