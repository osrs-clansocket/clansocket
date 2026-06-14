import type Database from "better-sqlite3";
import { broadcastDbWrite, type DbWriteKind } from "./writes-stream.js";

const WS_CHARS = new Set([" ", "\t", "\n", "\r"]);
const IDENT_TERMINATORS = new Set([" ", "\t", "\n", "\r", "(", ",", ";", ".", "\0"]);

function skipWs(s: string, i: number): number {
    while (i < s.length && WS_CHARS.has(s[i])) i++;
    return i;
}

function readWord(s: string, i: number): { word: string; next: number } {
    const start = i;
    while (i < s.length && !IDENT_TERMINATORS.has(s[i])) i++;
    return { word: s.slice(start, i), next: i };
}

function unquoteIdent(raw: string): string {
    if (raw.length < 2) return raw;
    const first = raw[0];
    const last = raw[raw.length - 1];
    if ((first === '"' && last === '"') || (first === "`" && last === "`")) {
        return raw.slice(1, -1);
    }
    if (first === "[" && last === "]") return raw.slice(1, -1);
    return raw;
}

export interface WriteSig {
    kind: DbWriteKind;
    table: string;
}

export function extractWrite(sql: string): WriteSig | null {
    let i = skipWs(sql, 0);
    const head = readWord(sql, i);
    const kw = head.word.toUpperCase();
    i = head.next;
    if (kw === "INSERT" || kw === "REPLACE") {
        i = skipWs(sql, i);
        let next = readWord(sql, i);
        let upper = next.word.toUpperCase();
        if (upper === "OR") {
            i = skipWs(sql, next.next);
            const action = readWord(sql, i);
            i = skipWs(sql, action.next);
            next = readWord(sql, i);
            upper = next.word.toUpperCase();
        }
        if (upper !== "INTO") return null;
        i = skipWs(sql, next.next);
        const t = readWord(sql, i);
        if (t.word.length === 0) return null;
        return { kind: kw === "INSERT" ? "insert" : "replace", table: unquoteIdent(t.word) };
    }
    if (kw === "UPDATE") {
        i = skipWs(sql, i);
        let next = readWord(sql, i);
        if (next.word.toUpperCase() === "OR") {
            i = skipWs(sql, next.next);
            const action = readWord(sql, i);
            i = skipWs(sql, action.next);
            next = readWord(sql, i);
        }
        if (next.word.length === 0) return null;
        return { kind: "update", table: unquoteIdent(next.word) };
    }
    if (kw === "DELETE") {
        i = skipWs(sql, i);
        const fromKw = readWord(sql, i);
        if (fromKw.word.toUpperCase() !== "FROM") return null;
        i = skipWs(sql, fromKw.next);
        const t = readWord(sql, i);
        if (t.word.length === 0) return null;
        return { kind: "delete", table: unquoteIdent(t.word) };
    }
    return null;
}

interface RunResultLike {
    changes: number;
}

interface PreparedStmtLike {
    run: (...args: unknown[]) => RunResultLike;
}

export function wrapDbForWrites(db: Database.Database, scopeKey: string): void {
    const target = db as unknown as { prepare: (sql: string) => unknown };
    const origPrepare = target.prepare.bind(db);
    target.prepare = (sql: string): unknown => {
        const stmt = origPrepare(sql);
        const sig = extractWrite(sql);
        if (!sig) return stmt;
        const s = stmt as PreparedStmtLike;
        const origRun = s.run.bind(s);
        s.run = (...args: unknown[]): RunResultLike => {
            const res = origRun(...args);
            if (res.changes > 0) broadcastDbWrite(scopeKey, sig.table, sig.kind);
            return res;
        };
        return stmt;
    };
}
