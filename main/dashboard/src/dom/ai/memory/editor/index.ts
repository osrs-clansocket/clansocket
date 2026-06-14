import { createInstance } from "../../../factory";
import type { MemoryFile } from "../../../../ai/memory-client";
import { buildEditorForm } from "./form-builder.js";
import { readForm } from "./file-io.js";
import type { EditorCallbacks, Mode } from "./constants.js";

export { MODE_CREATE, MODE_EDIT, type EditorCallbacks, type Mode } from "./constants.js";
export { emptyDraft } from "./file-io.js";

function wireEditor(formEl: HTMLFormElement, mode: Mode, id: string, cb: EditorCallbacks): void {
    formEl.querySelector<HTMLButtonElement>("[data-cancel]")!.addEventListener("click", cb.onCancel);
    const deleteBtn = formEl.querySelector<HTMLButtonElement>("[data-delete]");
    if (deleteBtn) deleteBtn.addEventListener("click", () => cb.onDelete(id));
    formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        cb.onSave(readForm(formEl), mode);
    });
}

export function renderEditor(container: HTMLElement, mode: Mode, file: MemoryFile, cb: EditorCallbacks): void {
    const containerInst = createInstance(container);
    const formInst = buildEditorForm(file, mode);
    containerInst.setChildren(formInst);
    wireEditor(formInst.el, mode, file.id, cb);
}
