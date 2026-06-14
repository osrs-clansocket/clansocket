import { tableMeta } from "../table-meta.js";

export type TableIconSpec = { kind: "asset"; src: string } | { kind: "bi"; name: string };

export function tableIconSpec(table: string): TableIconSpec {
    const meta = tableMeta(table);
    if (meta.assetPath !== undefined) return { kind: "asset", src: meta.assetPath };
    return { kind: "bi", name: meta.icon };
}
