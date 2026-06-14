import { existsSync, readFileSync } from "fs";
import { filePath } from "./paths.js";
import { ID_PATTERN, MAX_CONTENT_BYTES, type MemoryFile, type MemoryOp } from "./types.js";

export function validateOp(op: MemoryOp): string | null {
    if (!op.id || typeof op.id !== "string") return "id must be a non-empty string";
    if (!ID_PATTERN.test(op.id))
        return `id "${op.id}" must match ${ID_PATTERN.source} (lowercase, digits, hyphens, 2-64 chars)`;
    if (op.action === "create" || op.action === "update") {
        if (!op.content || typeof op.content !== "string") return "content must be a non-empty string";
        if (Buffer.byteLength(op.content, "utf-8") > MAX_CONTENT_BYTES) {
            return `content exceeds ${MAX_CONTENT_BYTES} bytes`;
        }
    }
    return null;
}

export function buildFile(op: MemoryOp, existing?: MemoryFile): MemoryFile {
    return {
        id: op.id,
        type: op.type ?? existing?.type ?? "context",
        priority: typeof op.priority === "number" ? op.priority : (existing?.priority ?? 20),
        always_load: op.always_load ?? existing?.always_load ?? false,
        triggers: op.triggers ?? existing?.triggers ?? [],
        depends_on: op.depends_on ?? existing?.depends_on ?? [],
        placeholders: op.placeholders ?? existing?.placeholders ?? [],
        content: op.content ?? existing?.content ?? "",
    };
}

export function readExisting(id: string): MemoryFile | undefined {
    const p = filePath(id);
    if (!existsSync(p)) return undefined;
    try {
        return JSON.parse(readFileSync(p, "utf-8")) as MemoryFile;
    } catch {
        return undefined;
    }
}
