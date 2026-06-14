import { createInstance, div, flashInvalid, input, textarea } from "../../../../factory";
import { profileStore, type SessionEntry } from "../../../../../ai/profile-store";
import {
    INLINE_INPUT_CLASS,
    INLINE_INPUT_INVALID_CLASS,
    ROW_ACTIONS_CLASS,
    ROW_CLASS,
    ROW_EDITING_CLASS,
    SESSION_EDIT_GRID_CLASS,
    setEditing,
} from "../state.js";
import { iconBtn } from "../shared.js";

interface SessionInputs {
    they: HTMLTextAreaElement;
    i: HTMLTextAreaElement;
    learned: HTMLInputElement;
    fix: HTMLInputElement;
    failure: HTMLInputElement;
}

function buildSessionInputs(initial: Partial<SessionEntry> | null): SessionInputs & { el: HTMLElement } {
    const theyEl = textarea({
        classes: [INLINE_INPUT_CLASS],
        value: initial?.they ?? "",
        placeholder: "they: what the user signaled",
        rows: "2",
        ariaLabel: "they",
        context: "what the user signaled this turn",
        meta: ["input"],
    });
    const iEl = textarea({
        classes: [INLINE_INPUT_CLASS],
        value: initial?.i ?? "",
        placeholder: "i: what was done in response",
        rows: "2",
        ariaLabel: "i",
        context: "what was done in response",
        meta: ["input"],
    });
    const learnedEl = input({
        classes: [INLINE_INPUT_CLASS],
        value: initial?.learned ?? "",
        placeholder: "learned (optional)",
        ariaLabel: "learned",
        context: "what was learned this turn (optional)",
        meta: ["input"],
    });
    const fixEl = input({
        classes: [INLINE_INPUT_CLASS],
        value: initial?.fix ?? "",
        placeholder: "fix (optional)",
        ariaLabel: "fix",
        context: "the fix applied this turn (optional)",
        meta: ["input"],
    });
    const failureEl = input({
        classes: [INLINE_INPUT_CLASS],
        value: initial?.failure ?? "",
        placeholder: "failure (optional)",
        ariaLabel: "failure",
        context: "the failure noted this turn (optional)",
        meta: ["input"],
    });
    const grid = div({ classes: [SESSION_EDIT_GRID_CLASS], context: null, meta: null }, [
        theyEl,
        iEl,
        learnedEl,
        fixEl,
        failureEl,
    ]);
    return {
        they: theyEl.el,
        i: iEl.el,
        learned: learnedEl.el,
        fix: fixEl.el,
        failure: failureEl.el,
        el: grid.el,
    };
}

export function renderEditableSessionRow(host: HTMLElement, initial: SessionEntry | null, rerender: () => void): void {
    const inputs = buildSessionInputs(initial);
    function save(): void {
        const they = inputs.they.value.trim();
        const iVal = inputs.i.value.trim();
        if (they.length === 0 || iVal.length === 0) {
            const badEl = they.length === 0 ? inputs.they : inputs.i;
            badEl.classList.add(INLINE_INPUT_INVALID_CLASS);
            flashInvalid(badEl);
            return;
        }
        const entry: Omit<SessionEntry, "turn"> = { they, i: iVal };
        const learned = inputs.learned.value.trim();
        const fix = inputs.fix.value.trim();
        const failure = inputs.failure.value.trim();
        if (learned.length > 0) entry.learned = learned;
        if (fix.length > 0) entry.fix = fix;
        if (failure.length > 0) entry.failure = failure;
        if (initial === null) profileStore.addSession(entry);
        else profileStore.updateSession(initial.turn, entry);
        setEditing(null);
        rerender();
    }
    function cancel(): void {
        setEditing(null);
        rerender();
    }
    const row = div({ classes: [ROW_CLASS, ROW_EDITING_CLASS], context: null, meta: null }, [
        inputs.el,
        div({ classes: [ROW_ACTIONS_CLASS], context: null, meta: null }, [
            iconBtn("check-lg", "save", save),
            iconBtn("x-lg", "cancel", cancel),
        ]),
    ]);
    createInstance(host).addChild(row);
    queueMicrotask(() => inputs.they.focus());
}
