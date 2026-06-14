// Non-regex SQL parsing for the AI query gate. Two responsibilities:
//
//  1. extractTableReferences — find every identifier referenced after a FROM
//     or JOIN keyword. Used to gate AI SQL against an allowlist of permitted
//     tables/views.
//
//  2. containsBlockedKeyword — detect write/DDL/admin keywords (INSERT,
//     UPDATE, DELETE, DROP, ALTER, CREATE, ATTACH, DETACH, PRAGMA, VACUUM,
//     REINDEX) anywhere in the SQL, with word-boundary awareness so legit
//     identifiers like `last_update_at` arent false-positives.
//
// All identifier matches respect word boundaries — a keyword only counts when
// the surrounding characters are non-alphanumeric/underscore. Comparison is
// done on the upper-cased string for case insensitivity; offending names are
// returned lowercased to match the manifest convention.

function isWordChar(ch: string): boolean {
    return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "_";
}

function isWhitespace(ch: string): boolean {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function isKeywordAt(upper: string, at: number, keyword: string): boolean {
    if (at + keyword.length > upper.length) return false;
    if (at > 0 && isWordChar(upper[at - 1]!)) return false;
    for (let j = 0; j < keyword.length; j++) {
        if (upper[at + j] !== keyword[j]) return false;
    }
    const tail = at + keyword.length;
    if (tail < upper.length && isWordChar(upper[tail]!)) return false;
    return true;
}

export function extractTableReferences(sql: string): string[] {
    const upper = sql.toUpperCase();
    const tables: string[] = [];
    let i = 0;
    while (i < upper.length) {
        const isFrom = isKeywordAt(upper, i, "FROM");
        const isJoin = !isFrom && isKeywordAt(upper, i, "JOIN");
        if (!isFrom && !isJoin) {
            i++;
            continue;
        }
        i += 4;
        while (i < sql.length && isWhitespace(sql[i]!)) i++;
        const start = i;
        while (i < sql.length && isWordChar(sql[i]!)) i++;
        if (i > start) tables.push(sql.slice(start, i).toLowerCase());
    }
    return tables;
}

export function tableReferencesAreAllowed(
    sql: string,
    allowed: ReadonlySet<string>,
): { ok: boolean; offending?: string } {
    const refs = extractTableReferences(sql);
    for (const t of refs) {
        if (!allowed.has(t)) return { ok: false, offending: t };
    }
    return { ok: true };
}

const BLOCKED_KEYWORDS = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "ATTACH",
    "DETACH",
    "PRAGMA",
    "VACUUM",
    "REINDEX",
] as const;

export function containsBlockedKeyword(sql: string): string | null {
    const upper = sql.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
        for (const kw of BLOCKED_KEYWORDS) {
            if (isKeywordAt(upper, i, kw)) return kw.toLowerCase();
        }
    }
    return null;
}
