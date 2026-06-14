import { EXT_JSON, EXT_MD } from "../../../shared/http/http-mime.js";
import logger from "@clansocket/logger";
import { existsSync, readdirSync, statSync, watch } from "fs";
import { join, resolve } from "path";
import { MEMORY_DIR, PROMPTS_DIR, readJson, readMd } from "./file-reader.js";
import type { PromptFile } from "./types.js";

const WATCHER_DEBOUNCE_MS = 200;

export const registry: Map<string, PromptFile> = new Map();
let scanned = false;
let watcher: ReturnType<typeof watch> | null = null;

function loadPromptAt(full: string, entry: string): void {
    try {
        const file = entry.endsWith(EXT_MD) ? readMd<PromptFile>(full) : readJson<PromptFile>(full);
        if (file.id && file.type && file.content) {
            registry.set(file.id, file);
        }
    } catch {}
}

function scanDir(dir: string): void {
    for (const entry of readdirSync(dir)) {
        const full = resolve(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            scanDir(full);
            continue;
        }
        if (entry === "registry.json") continue;
        if (entry.endsWith(EXT_MD) || entry.endsWith(EXT_JSON)) loadPromptAt(full, entry);
    }
}

export function reloadPrompts(): void {
    scanDir(PROMPTS_DIR);
    if (existsSync(MEMORY_DIR)) scanDir(MEMORY_DIR);
}

export function ensureInit(): void {
    if (scanned) return;
    reloadPrompts();
    scanned = true;
}

function stopWatcher(): void {
    watcher?.close();
    watcher = null;
}

export function startWatcher(): () => void {
    if (watcher) return stopWatcher;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const schedule = (): void => {
        if (pending) clearTimeout(pending);
        pending = setTimeout(() => {
            pending = null;
            reloadPrompts();
            logger.info("[prompt-loader] rescanned prompts");
        }, WATCHER_DEBOUNCE_MS);
    };
    watcher = watch(PROMPTS_DIR, { recursive: true }, (_event, filename) => {
        if (typeof filename !== "string") return;
        if (filename.endsWith(EXT_MD) || filename.endsWith(EXT_JSON)) schedule();
    });
    return stopWatcher;
}

export function reloadFile(id: string): void {
    if (!existsSync(MEMORY_DIR)) {
        registry.delete(id);
        return;
    }
    const p = join(MEMORY_DIR, `${id}.json`);
    if (!existsSync(p)) {
        registry.delete(id);
        return;
    }
    try {
        const file = readJson<PromptFile>(p);
        if (file.id && file.type && file.content) registry.set(file.id, file);
    } catch {}
}
