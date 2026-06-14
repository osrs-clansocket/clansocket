import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROMPTS_DIR = resolve(__dirname, "..", "..", "prompts");
export const MEMORY_DIR = resolve(__dirname, "..", "..", "memory", "memory");

export function readJson<T>(filePath: string): T {
    return JSON.parse(readFileSync(filePath, "utf-8"));
}

function parseFrontmatterValue(raw: string): unknown {
    const s = raw.trim();
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "null") return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
        try {
            return JSON.parse(s);
        } catch {
            return s;
        }
    }
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    return s;
}

export function readMd<T>(filePath: string): T {
    const raw = readFileSync(filePath, "utf-8");
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
    if (!match) throw new Error(`Missing frontmatter in ${filePath}`);
    const meta: Record<string, unknown> = {};
    for (const line of match[1]!.split(/\r?\n/)) {
        if (line.trim().length === 0 || line.trim().startsWith("#")) continue;
        const idx = line.indexOf(":");
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        meta[key] = parseFrontmatterValue(line.slice(idx + 1));
    }
    meta.content = match[2]!.trimStart();
    return meta as T;
}
