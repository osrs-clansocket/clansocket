import { promptLoader } from "../../persona/prompt-loader/index.js";

export function resolvePinItems(ids: string[], siteAccountId: string): { id: string; content: string }[] {
    if (ids.length === 0) return [];
    const files = promptLoader.resolveByIds(ids, { siteAccountId, pageState: null });
    const byId = new Map(files.map((f) => [f.id, f.content] as const));
    return ids.map((id) => ({ id, content: byId.get(id) ?? "" }));
}

function isWordChar(ch: string): boolean {
    return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "_";
}

export function extractTableAfterFrom(sql: string): string | null {
    const upper = sql.toUpperCase();
    const idx = upper.indexOf(" FROM ");
    if (idx < 0) return null;
    let start = idx + 6;
    while (start < sql.length && (sql[start] === " " || sql[start] === "\t")) start++;
    let end = start;
    while (end < sql.length && isWordChar(sql[end]!)) end++;
    const token = sql.slice(start, end);
    return token || null;
}

export function extractDisplayText(raw: string): string {
    try {
        const openIdx = raw.indexOf("{");
        const closeIdx = raw.lastIndexOf("}");
        if (openIdx < 0 || closeIdx <= openIdx) return raw.length > 200 ? raw.slice(0, 197) + "..." : raw;
        const json = JSON.parse(raw.slice(openIdx, closeIdx + 1));
        return json.message ?? json.recap?.current ?? "Response received";
    } catch {
        return raw.length > 200 ? raw.slice(0, 197) + "..." : raw;
    }
}
