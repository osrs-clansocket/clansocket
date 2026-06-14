import type { MemoryFile } from "../../../../ai/memory-client";
import type { SelectOption } from "../../../forms/glass/inputs/glass-select.js";

export const MODE_EDIT = "edit";
export const MODE_CREATE = "create";
export const TYPE_CONTEXT = "context";
export const TYPE_FIELD = "type";
export const DEFAULT_PRIORITY = 20;
export const MAX_PRIORITY = 99;
export const CHECK_PATH = "M3 7.25L5.75 10L11 4.25";

export type Mode = typeof MODE_EDIT | typeof MODE_CREATE;
export type MemoryType = MemoryFile["type"];

export interface EditorCallbacks {
    onSave: (draft: MemoryFile, mode: Mode) => void | Promise<void>;
    onDelete: (id: string) => void | Promise<void>;
    onCancel: () => void;
}

const TYPES: MemoryType[] = [TYPE_CONTEXT, "system", "schema", "mode", "template"];
export const TYPE_OPTIONS: SelectOption[] = TYPES.map((t) => ({ value: t, label: t }));
