import { registry } from "./registry.js";
import type { DynamicProvider, PromptFile } from "./types.js";

const dynamicProviders = new Map<string, DynamicProvider>();
const autoPinIds = new Set<string>();

export function registerDynamic(entry: Omit<PromptFile, "content">, provider: DynamicProvider, autoPin: boolean): void {
    dynamicProviders.set(entry.id, provider);
    if (autoPin) autoPinIds.add(entry.id);
    registry.set(entry.id, { ...entry, content: "" } as PromptFile);
}

export function getAutoPinIds(): string[] {
    return Array.from(autoPinIds);
}

export function hasDynamic(id: string): boolean {
    return dynamicProviders.has(id);
}

export function callDynamic(id: string, ctx: Parameters<DynamicProvider>[0]): string {
    return dynamicProviders.get(id)!(ctx);
}
