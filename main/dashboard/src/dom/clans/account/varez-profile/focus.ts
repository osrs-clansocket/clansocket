import { BTN_VARIANT_OUTLINE, button, createInstance, div, input, paragraph, span, type Child } from "../../../factory";
import { profileStore } from "../../../../ai/profile-store";
import {
    EMPTY_CLASS,
    FIELD_LABEL_CLASS,
    HEADER_ROW_CLASS,
    INLINE_INPUT_CLASS,
    ROW_ACTIONS_CLASS,
    ROW_CLASS,
    ROW_EDITING_CLASS,
    ROW_PRIMARY_CLASS,
    getEditing,
    setEditing,
} from "./state.js";
import { iconBtn } from "./shared.js";

export function renderFocus(host: HTMLElement, focus: string | null, rerender: () => void): void {
    const root = createInstance(host);
    const editing = getEditing();
    const headerChildren: Child[] = [span({ classes: [FIELD_LABEL_CLASS], text: "Focus", context: null, meta: null })];
    if (focus === null && editing?.kind !== "edit-focus") {
        headerChildren.push(
            button({
                variant: BTN_VARIANT_OUTLINE,
                compact: true,
                text: "+ set",
                ariaLabel: "Set focus",
                context: "set a focus thread phrase",
                meta: ["action"],
                onClick: () => {
                    setEditing({ kind: "edit-focus" });
                    rerender();
                },
            }),
        );
    }
    root.addChild(div({ classes: [HEADER_ROW_CLASS], context: null, meta: null }, headerChildren));

    if (editing?.kind === "edit-focus") {
        const valInput = input({
            classes: [INLINE_INPUT_CLASS, ROW_PRIMARY_CLASS],
            value: focus ?? "",
            placeholder: "Current thread phrase",
            ariaLabel: "Focus value",
            context: "enter the focus thread phrase",
            meta: ["input"],
            onKeydown: (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancel();
                }
            },
        });
        function save(): void {
            const v = valInput.el.value.trim();
            profileStore.setFocus(v.length > 0 ? v : null);
            setEditing(null);
            rerender();
        }
        function cancel(): void {
            setEditing(null);
            rerender();
        }
        const row = div({ classes: [ROW_CLASS, ROW_EDITING_CLASS], context: null, meta: null }, [
            valInput,
            div({ classes: [ROW_ACTIONS_CLASS], context: null, meta: null }, [
                iconBtn("check-lg", "save", save),
                iconBtn("x-lg", "cancel", cancel),
            ]),
        ]);
        root.addChild(row);
        queueMicrotask(() => valInput.el.focus());
        return;
    }

    if (focus === null) {
        root.addChild(paragraph({ classes: [EMPTY_CLASS], text: "No focus set", context: null, meta: null }));
        return;
    }

    root.addChild(
        div({ classes: [ROW_CLASS], context: null, meta: null }, [
            span({ classes: [ROW_PRIMARY_CLASS], text: focus, context: null, meta: null }),
            div({ classes: [ROW_ACTIONS_CLASS], context: null, meta: null }, [
                iconBtn("pencil", "edit", () => {
                    setEditing({ kind: "edit-focus" });
                    rerender();
                }),
                iconBtn("trash", "remove", () => {
                    profileStore.setFocus(null);
                    rerender();
                }),
            ]),
        ]),
    );
}
