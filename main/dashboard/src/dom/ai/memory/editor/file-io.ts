import type { MemoryFile } from "../../../../ai/memory-client";
import { DEFAULT_PRIORITY, TYPE_CONTEXT, TYPE_FIELD, type MemoryType } from "./constants.js";

export function makeFile(overrides: Partial<MemoryFile>): MemoryFile {
    return {
        id: "",
        type: TYPE_CONTEXT,
        priority: DEFAULT_PRIORITY,
        always_load: false,
        triggers: [],
        depends_on: [],
        placeholders: [],
        content: "",
        ...overrides,
    };
}

export function readForm(formEl: HTMLFormElement): MemoryFile {
    const data = new FormData(formEl);
    const triggers = String(data.get("triggers") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    const priority = parseInt(String(data.get("priority") ?? String(DEFAULT_PRIORITY)), 10) || DEFAULT_PRIORITY;
    return makeFile({
        id: String(data.get("id") ?? "").trim(),
        type: String(data.get(TYPE_FIELD) ?? TYPE_CONTEXT) as MemoryType,
        priority,
        always_load: data.get("always_load") === "on",
        triggers,
        content: String(data.get("content") ?? ""),
    });
}

export function emptyDraft(): MemoryFile {
    return makeFile({});
}
