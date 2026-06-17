import { signal, type Instance } from "../../dom/factory/index.js";

export const inspectorOverride$ = signal<(() => Instance[]) | null>(null);
