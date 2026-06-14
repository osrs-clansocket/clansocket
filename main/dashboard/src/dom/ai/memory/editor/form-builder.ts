import { button, div, form, type Child, type Instance } from "../../../factory";
import type { MemoryFile } from "../../../../ai/memory-client";
import { buildGlassCheck } from "../../../forms/glass/inputs/glass-check.js";
import { buildGlassSelect } from "../../../forms/glass/inputs/glass-select.js";
import { MODE_EDIT, TYPE_FIELD, TYPE_OPTIONS, type Mode } from "./constants.js";
import { buildContentTextarea, buildIdInput, buildPriorityInput, buildTriggersInput, fieldRow } from "./inputs.js";
import {
    AI_MEMORY_ACTIONS_CLASS,
    AI_MEMORY_BTN_CANCEL_CLASS,
    AI_MEMORY_BTN_CLASS,
    AI_MEMORY_BTN_DELETE_CLASS,
    AI_MEMORY_BTN_SAVE_CLASS,
    AI_MEMORY_EDITOR_CLASS,
} from "../../../../shared/constants/ai-memory-constants.js";

function buildFields(file: MemoryFile, mode: Mode): Instance[] {
    return [
        fieldRow("ID", buildIdInput(file.id, mode)),
        fieldRow("Type", buildGlassSelect(TYPE_FIELD, TYPE_OPTIONS, file.type)),
        fieldRow("Priority", buildPriorityInput(file.priority)),
        fieldRow("Triggers (comma-separated)", buildTriggersInput(file.triggers.join(", "))),
        fieldRow("Always load", buildGlassCheck({ name: "always_load", checked: () => file.always_load })),
        fieldRow("Content", buildContentTextarea(file.content)),
    ];
}

function buildActions(mode: Mode): Instance {
    const cancelBtn = button({
        classes: [AI_MEMORY_BTN_CLASS, AI_MEMORY_BTN_CANCEL_CLASS],
        text: "Cancel",
        data: { cancel: "" },
        context: "cancel editing this memory",
        meta: ["action"],
    });
    const saveBtn = button({
        classes: [AI_MEMORY_BTN_CLASS, AI_MEMORY_BTN_SAVE_CLASS],
        text: mode === MODE_EDIT ? "Save" : "Create",
        type: "submit",
        context: "save the memory file",
        meta: ["submit"],
    });
    const children: Child[] = [cancelBtn];
    if (mode === MODE_EDIT) {
        children.push(
            button({
                classes: [AI_MEMORY_BTN_CLASS, AI_MEMORY_BTN_DELETE_CLASS],
                text: "Delete",
                data: { delete: "" },
                context: "delete this memory file",
                meta: ["destructive"],
            }),
        );
    }
    children.push(saveBtn);
    return div({ classes: [AI_MEMORY_ACTIONS_CLASS], context: null, meta: null }, children);
}

export function buildEditorForm(file: MemoryFile, mode: Mode): Instance<HTMLFormElement> {
    return form(
        {
            classes: [AI_MEMORY_EDITOR_CLASS],
            context: "memory editor form — submit to save the memory",
            meta: ["submit"],
        },
        [...buildFields(file, mode), buildActions(mode)],
    );
}
