import type { BrowseResponse, Scope, ScopeListItem } from "./data-rights-client/index.js";

const KEY_PREFIX = "clansocket:";
const TABLE_LOCAL = "localStorage";
const TABLE_SESSION = "sessionStorage";

function storageFor(table: string): Storage | null {
    if (table === TABLE_LOCAL) return localStorage;
    if (table === TABLE_SESSION) return sessionStorage;
    return null;
}

function listPrefixedKeys(s: Storage): string[] {
    const out: string[] = [];
    for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(KEY_PREFIX)) out.push(k);
    }
    return out.sort();
}

function isNumeric(t: string): boolean {
    if (t.length === 0) return false;
    let i = 0;
    if (t[0] === "-") i = 1;
    if (i === t.length) return false;
    let hasDigit = false;
    let dotSeen = false;
    while (i < t.length) {
        const c = t[i];
        if (c >= "0" && c <= "9") {
            hasDigit = true;
            i++;
            continue;
        }
        if (c === "." && !dotSeen && hasDigit) {
            dotSeen = true;
            i++;
            continue;
        }
        return false;
    }
    return hasDigit;
}

function detectType(v: string): string {
    const t = v.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
        try {
            JSON.parse(t);
            return "json";
        } catch {
            return "string";
        }
    }
    if (t === "true" || t === "false") return "boolean";
    if (isNumeric(t)) return "number";
    return "string";
}

function rowFor(key: string, value: string): Record<string, unknown> {
    return {
        key,
        value,
        length: value.length,
        type: detectType(value),
    };
}

export function getLocalScopes(): ScopeListItem[] {
    const localKeys = listPrefixedKeys(localStorage);
    const sessionKeys = listPrefixedKeys(sessionStorage);
    return [
        {
            kind: "local",
            label: "Browser storage",
            tables: [
                { name: TABLE_LOCAL, hasRows: localKeys.length > 0 },
                { name: TABLE_SESSION, hasRows: sessionKeys.length > 0 },
            ],
        },
    ];
}

export function isLocalScope(scope: Scope): boolean {
    return scope.kind === "local";
}

export function browseLocal(_scope: Scope, table: string, limit: number, offset: number): BrowseResponse {
    const s = storageFor(table);
    if (!s) return emptyResponse();
    const keys = listPrefixedKeys(s);
    const total = keys.length;
    const slice = keys.slice(offset, offset + limit);
    const rows = slice.map((k) => rowFor(k, s.getItem(k) ?? ""));
    return {
        rows,
        total,
        pkCols: ["key"],
        tsCol: null,
        excludedColumns: [],
        secretColumns: ["value"],
        canDeleteRow: true,
        canBulkDelete: false,
    };
}

function emptyResponse(): BrowseResponse {
    return {
        rows: [],
        total: 0,
        pkCols: ["key"],
        tsCol: null,
        excludedColumns: [],
        secretColumns: ["value"],
        canDeleteRow: false,
        canBulkDelete: false,
    };
}

export function deleteLocalRow(_scope: Scope, table: string, row: Record<string, unknown>): { ok: boolean } {
    const s = storageFor(table);
    if (!s) return { ok: false };
    const key = String(row.key ?? "");
    if (!key.startsWith(KEY_PREFIX)) return { ok: false };
    s.removeItem(key);
    return { ok: true };
}
