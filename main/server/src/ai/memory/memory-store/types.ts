export const MAX_FILES = 50;
export const MAX_CONTENT_BYTES = 16 * 1024;
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

export type MemoryAction = "create" | "update" | "delete";

export interface MemoryFile {
    id: string;
    type: "system" | "schema" | "context" | "mode" | "template";
    priority: number;
    always_load: boolean;
    triggers: string[];
    depends_on: string[];
    placeholders: string[];
    content: string;
}

export interface MemoryOp {
    action: MemoryAction;
    id: string;
    type?: MemoryFile["type"];
    priority?: number;
    always_load?: boolean;
    triggers?: string[];
    depends_on?: string[];
    placeholders?: string[];
    content?: string;
}

export interface MemoryResult {
    action: MemoryAction;
    id: string;
    ok: boolean;
    error?: string;
    pinned?: boolean;
    before?: string;
    after?: string;
}
