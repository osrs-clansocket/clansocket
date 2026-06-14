import { EXT_JSON } from "../../../shared/http/http-mime.js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { create, remove, update } from "./crud.js";
import { MEMORY_DIR, ensureDir } from "./paths.js";
import type { MemoryFile, MemoryOp, MemoryResult } from "./types.js";
import { readExisting, validateOp } from "./validate.js";

export type { MemoryAction, MemoryFile, MemoryOp, MemoryResult } from "./types.js";

export const memoryStore = {
    dir: MEMORY_DIR,

    list(): MemoryFile[] {
        ensureDir();
        const files: MemoryFile[] = [];
        for (const entry of readdirSync(MEMORY_DIR)) {
            if (!entry.endsWith(EXT_JSON)) continue;
            try {
                files.push(JSON.parse(readFileSync(join(MEMORY_DIR, entry), "utf-8")) as MemoryFile);
            } catch {}
        }
        return files;
    },

    get(id: string): MemoryFile | undefined {
        ensureDir();
        return readExisting(id);
    },

    apply(op: MemoryOp): MemoryResult {
        ensureDir();
        const violation = validateOp(op);
        if (violation) return { action: op.action, id: op.id, ok: false, error: violation };
        if (op.action === "create") return create(op);
        if (op.action === "update") return update(op);
        if (op.action === "delete") return remove(op);
        return { action: op.action, id: op.id, ok: false, error: `unknown action "${op.action}"` };
    },
};
