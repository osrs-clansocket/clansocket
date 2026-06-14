import { EXT_JSON } from "../../../shared/http/http-mime.js";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MEMORY_DIR = resolve(__dirname, "..", "memory");
const PROMPTS_DIR = resolve(__dirname, "..", "..", "prompts");

export function ensureDir(): void {
    if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true });
}

export function filePath(id: string): string {
    return join(MEMORY_DIR, `${id}.json`);
}

function walkHasId(dir: string, id: string): boolean {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (walkHasId(full, id)) return true;
            continue;
        }
        if (!entry.name.endsWith(EXT_JSON)) continue;
        try {
            const raw = readFileSync(full, "utf-8");
            const parsed = JSON.parse(raw) as { id?: string };
            if (parsed.id === id) return true;
        } catch {}
    }
    return false;
}

export function idExistsInPrompts(id: string): boolean {
    if (!existsSync(PROMPTS_DIR)) return false;
    return walkHasId(PROMPTS_DIR, id);
}

export function currentCount(): number {
    ensureDir();
    return readdirSync(MEMORY_DIR).filter((f) => f.endsWith(EXT_JSON)).length;
}
