import type { FieldConstraint } from "../../schema.js";
import { META_SCHEMA, STYLE_SCHEMA } from "../../schema.js";
import { callDynamic, hasDynamic } from "./dynamic.js";
import { registry } from "./registry.js";
import type { DynamicContext, PromptFile } from "./types.js";

function resolveDynamic(file: PromptFile, ctx: DynamicContext): PromptFile {
    if (hasDynamic(file.id)) {
        return { ...file, content: callDynamic(file.id, ctx) };
    }
    return file;
}

function addWithDeps(file: PromptFile, result: PromptFile[], loaded: Set<string>, ctx: DynamicContext): void {
    if (loaded.has(file.id)) return;
    for (const depId of file.depends_on) {
        const dep = registry.get(depId);
        if (dep && !loaded.has(depId)) addWithDeps(dep, result, loaded, ctx);
    }
    loaded.add(file.id);
    result.push(resolveDynamic(file, ctx));
}

export function getOne(id: string, ctx: DynamicContext): PromptFile | null {
    const file = registry.get(id) ?? null;
    if (file && hasDynamic(id)) {
        file.content = callDynamic(id, ctx);
    }
    return file;
}

export function resolveForMode(modeId: string, ctx: DynamicContext): PromptFile[] {
    const result: PromptFile[] = [];
    const loaded = new Set<string>();
    for (const file of registry.values()) {
        if (file.always_load) addWithDeps(file, result, loaded, ctx);
    }
    const mode = registry.get(modeId);
    if (mode) {
        addWithDeps(mode, result, loaded, ctx);
        if (mode.auto_load_schemas) {
            for (const schemaId of mode.auto_load_schemas) {
                const schema = registry.get(schemaId);
                if (schema) addWithDeps(schema, result, loaded, ctx);
            }
        }
    }
    result.sort((a, b) => a.priority - b.priority);
    return result;
}

export function resolveByIds(ids: string[], ctx: DynamicContext): PromptFile[] {
    const result: PromptFile[] = [];
    const loaded = new Set<string>();
    for (const id of ids) {
        const file = registry.get(id);
        if (file) addWithDeps(file, result, loaded, ctx);
    }
    result.sort((a, b) => a.priority - b.priority);
    return result;
}

function formatSchema(schema: Record<string, FieldConstraint>): string {
    const lines: string[] = [];
    for (const [key, c] of Object.entries(schema)) {
        const parts = [`  ${key}: ${c.type}`];
        if (c.maxLength) parts.push(`maxLen=${c.maxLength}`);
        if (c.min !== undefined) parts.push(`min=${c.min}`);
        if (c.max !== undefined) parts.push(`max=${c.max}`);
        if (c.enumValues) parts.push(`enum=[${c.enumValues.join(",")}]`);
        if (c.description) parts.push(`— ${c.description}`);
        lines.push(parts.join(" "));
    }
    return lines.join("\n");
}

export function fillPlaceholders(content: string, data: Record<string, string>): string {
    let filled = content;
    const schemaMap: Record<string, Record<string, FieldConstraint>> = {
        "{{STYLE_SCHEMA}}": STYLE_SCHEMA,
        "{{META_SCHEMA}}": META_SCHEMA,
    };
    for (const [placeholder, schema] of Object.entries(schemaMap)) {
        if (filled.includes(placeholder)) filled = filled.replace(placeholder, formatSchema(schema));
    }
    for (const [key, value] of Object.entries(data)) {
        const tag = key.startsWith("__") && key.endsWith("__") ? `{{${key.slice(2, -2).toUpperCase()}}}` : null;
        if (tag && filled.includes(tag)) filled = filled.replaceAll(tag, value);
    }
    return filled;
}

export function readableIndex(): { id: string; type: string; preview: string }[] {
    return Array.from(registry.values())
        .filter((f) => !f.always_load)
        .map((f) => {
            const preview = hasDynamic(f.id)
                ? `(dynamic — read: ["${f.id}"] to load live content)`
                : f.content.slice(0, 80).replace(/\n/g, " ");
            return {
                id: f.id,
                type: f.type,
                preview,
            };
        });
}
