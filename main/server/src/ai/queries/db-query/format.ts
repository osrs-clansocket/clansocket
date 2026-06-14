import type { QueryResult } from "./types.js";

export function formatResults(results: QueryResult[]): string {
    const parts: string[] = [];
    for (const r of results) {
        const header = r.clan ? `[QUERY: ${r.db} clan=${r.clan}] ${r.sql}` : `[QUERY: ${r.db}] ${r.sql}`;
        parts.push(header);
        if (r.error) {
            parts.push(`Error: ${r.error}`);
        }
        if (r.rows.length > 0) {
            const cols = Object.keys(r.rows[0]!);
            parts.push(cols.join(" | "));
            for (const row of r.rows) {
                parts.push(cols.map((c) => String(row[c] ?? "")).join(" | "));
            }
        } else if (!r.error) {
            parts.push("(no rows)");
        }
        parts.push("");
    }
    return parts.join("\n");
}
