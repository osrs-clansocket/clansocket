#!/usr/bin/env node
// Builds `clansocket-app/sql-schema-constitution.md` — the per-db, per-table,
// per-field source-of-truth comparing current schemas+migrations against the
// PLUGIN-DB-REDESIGN-CHECKLIST.md target tree.
//
// Usage (from clansocket-app/):
//   node scripts/build-scripts/build-schema-constitution-script.mjs > sql-schema-constitution.md
//
// Inputs (read-only):
//   main/server/src/database/schemas/**/*.sql      current shape (per DB kind)
//   main/server/src/database/migrations/**/*.ts    applied operations on top
//   main/server/src/database/plugin/saturated-tables.ts   shared constants
//   PLUGIN-DB-REDESIGN-CHECKLIST.md                target shape (the tree)
//   scripts/script-data/field-rules.mjs                        per-field annotations (axis,
//                                                  pairing, provenance, types,
//                                                  PKs, indexes for target shape)
//
// Output: sql-schema-constitution.md (overview + per-table detail cards).
//
// To update annotations: edit scripts/script-data/field-rules.mjs and re-run.
// To pick up schema/migration changes: re-run (no rule changes needed for
// fields that follow existing patterns).
//
// Constraint: no regex. SQL/TS parsing uses indexOf + manual char walks per
// the project-wide regex ban (memory: feedback_code_rules).

import { readFileSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { rules } from "../script-data/field-rules.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");
const SCHEMAS_ROOT = join(APP_ROOT, "main/server/src/database/schemas");
const MIGRATIONS_ROOT = join(APP_ROOT, "main/server/src/database/migrations");
const CHECKLIST_PATH = join(APP_ROOT, "PLUGIN-DB-REDESIGN-CHECKLIST.md");
const SATURATED_PATH = join(APP_ROOT, "main/server/src/database/plugin/saturated-tables.ts");

const DB_KINDS = ["discord", "clansocket", "clan", "clan_audit", "varez", "plugin"];

// ─────────────────────────────────────────────────────────────────────
// low-level char utilities
// ─────────────────────────────────────────────────────────────────────
function isIdentChar(ch) {
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_";
}
function isWs(ch) {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}
function skipWs(src, i) {
    while (i < src.length && isWs(src[i])) i++;
    return i;
}
function readIdent(src, i) {
    const start = i;
    while (i < src.length && isIdentChar(src[i])) i++;
    return { text: src.slice(start, i), end: i };
}
function readStringLit(src, i) {
    // expects src[i] === '"' or "'"
    const quote = src[i];
    if (quote !== '"' && quote !== "'") return null;
    let j = i + 1;
    let out = "";
    while (j < src.length) {
        if (src[j] === "\\") {
            out += src[j + 1] ?? "";
            j += 2;
            continue;
        }
        if (src[j] === quote) return { text: out, end: j + 1 };
        out += src[j];
        j++;
    }
    return null;
}
function readBackTickLit(src, i) {
    if (src[i] !== "`") return null;
    let j = i + 1;
    let out = "";
    while (j < src.length) {
        if (src[j] === "\\") {
            out += src[j + 1] ?? "";
            j += 2;
            continue;
        }
        if (src[j] === "`") return { text: out, end: j + 1 };
        out += src[j];
        j++;
    }
    return null;
}

// find the offset of matching ')' starting just after the '(' at pos `lparenIdx`
function findMatchingParen(src, lparenIdx) {
    let depth = 0;
    let i = lparenIdx;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '"' || ch === "'") {
            const lit = readStringLit(src, i);
            if (lit) { i = lit.end; continue; }
        }
        if (ch === "`") {
            const lit = readBackTickLit(src, i);
            if (lit) { i = lit.end; continue; }
        }
        if (ch === "(") depth++;
        else if (ch === ")") {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
}

// strip /* ... */ block comments and -- line comments from sql
function stripSqlComments(src) {
    let out = "";
    let i = 0;
    while (i < src.length) {
        if (src[i] === "-" && src[i + 1] === "-") {
            while (i < src.length && src[i] !== "\n") i++;
            continue;
        }
        if (src[i] === "/" && src[i + 1] === "*") {
            i += 2;
            while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
            i += 2;
            continue;
        }
        out += src[i];
        i++;
    }
    return out;
}

// split a sql col body by top-level commas (paren-depth aware, quote-aware)
function splitTopLevelCommas(body) {
    const out = [];
    let depth = 0;
    let cur = "";
    let i = 0;
    while (i < body.length) {
        const ch = body[i];
        if (ch === '"' || ch === "'") {
            const lit = readStringLit(body, i);
            if (lit) {
                cur += body.slice(i, lit.end);
                i = lit.end;
                continue;
            }
        }
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (ch === "," && depth === 0) {
            out.push(cur.trim());
            cur = "";
            i++;
            continue;
        }
        cur += ch;
        i++;
    }
    if (cur.trim().length) out.push(cur.trim());
    return out;
}

// case-insensitive substring match at exact position
function matchKwAt(src, i, kw) {
    const slice = src.slice(i, i + kw.length);
    if (slice.toUpperCase() !== kw.toUpperCase()) return false;
    const after = src[i + kw.length];
    if (after === undefined) return true;
    return !isIdentChar(after);
}

// case-insensitive find next position of kw in src starting from i, must be word-boundary
function findKw(src, kw, from = 0) {
    const upper = src.toUpperCase();
    const target = kw.toUpperCase();
    let i = from;
    while (i < upper.length) {
        const j = upper.indexOf(target, i);
        if (j < 0) return -1;
        const before = upper[j - 1];
        const after = upper[j + target.length];
        const boundaryBefore = j === 0 || !isIdentChar(before);
        const boundaryAfter = !isIdentChar(after);
        if (boundaryBefore && boundaryAfter) return j;
        i = j + 1;
    }
    return -1;
}

// ─────────────────────────────────────────────────────────────────────
// parse CREATE TABLE statements from sql source
// returns array of { table, cols: [{name, typeAndConstraints}], pk: [..], startIdx, endIdx }
// ─────────────────────────────────────────────────────────────────────
function extractCreateTables(src) {
    const out = [];
    let from = 0;
    while (true) {
        const idx = findKw(src, "CREATE", from);
        if (idx < 0) break;
        // expect TABLE after CREATE (with possible whitespace)
        let i = skipWs(src, idx + "CREATE".length);
        if (!matchKwAt(src, i, "TABLE")) { from = idx + 1; continue; }
        i += "TABLE".length;
        i = skipWs(src, i);
        // optional IF NOT EXISTS
        if (matchKwAt(src, i, "IF")) {
            i += 2;
            i = skipWs(src, i);
            if (matchKwAt(src, i, "NOT")) { i += 3; i = skipWs(src, i); }
            if (matchKwAt(src, i, "EXISTS")) { i += 6; i = skipWs(src, i); }
        }
        // table identifier
        const id = readIdent(src, i);
        if (!id.text) { from = idx + 1; continue; }
        i = skipWs(src, id.end);
        if (src[i] !== "(") { from = idx + 1; continue; }
        const closeParen = findMatchingParen(src, i);
        if (closeParen < 0) { from = idx + 1; continue; }
        const body = src.slice(i + 1, closeParen);
        const items = splitTopLevelCommas(body);
        const cols = [];
        let pk = [];
        for (const item of items) {
            if (matchKwAt(item, 0, "PRIMARY")) {
                // PRIMARY KEY (col, col)
                let k = "PRIMARY".length;
                k = skipWs(item, k);
                if (!matchKwAt(item, k, "KEY")) continue;
                k = skipWs(item, k + 3);
                if (item[k] !== "(") continue;
                const close = findMatchingParen(item, k);
                if (close < 0) continue;
                pk = splitTopLevelCommas(item.slice(k + 1, close)).map((c) => c.trim());
                continue;
            }
            if (matchKwAt(item, 0, "FOREIGN") || matchKwAt(item, 0, "UNIQUE") || matchKwAt(item, 0, "CHECK")) continue;
            // col definition: first ident is name
            const nameRead = readIdent(item, 0);
            if (!nameRead.text) continue;
            const rest = item.slice(nameRead.end).trim();
            // inline PRIMARY KEY
            if (findKw(rest, "PRIMARY") >= 0 && findKw(rest, "KEY") >= 0) {
                pk = [nameRead.text];
            }
            cols.push({ name: nameRead.text, typeAndConstraints: rest });
        }
        out.push({
            table: id.text,
            cols,
            pk,
            startIdx: idx,
            endIdx: closeParen + 1,
        });
        from = closeParen + 1;
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────
// parse CREATE INDEX statements
// ─────────────────────────────────────────────────────────────────────
function extractIndexes(src) {
    const out = [];
    let from = 0;
    while (true) {
        const idx = findKw(src, "CREATE", from);
        if (idx < 0) break;
        let i = skipWs(src, idx + "CREATE".length);
        if (matchKwAt(src, i, "UNIQUE")) { i += 6; i = skipWs(src, i); }
        if (!matchKwAt(src, i, "INDEX")) { from = idx + 1; continue; }
        i += "INDEX".length;
        i = skipWs(src, i);
        if (matchKwAt(src, i, "IF")) {
            i += 2;
            i = skipWs(src, i);
            if (matchKwAt(src, i, "NOT")) { i += 3; i = skipWs(src, i); }
            if (matchKwAt(src, i, "EXISTS")) { i += 6; i = skipWs(src, i); }
        }
        const nameRead = readIdent(src, i);
        if (!nameRead.text) { from = idx + 1; continue; }
        i = skipWs(src, nameRead.end);
        if (!matchKwAt(src, i, "ON")) { from = idx + 1; continue; }
        i = skipWs(src, i + 2);
        const tableRead = readIdent(src, i);
        if (!tableRead.text) { from = idx + 1; continue; }
        i = skipWs(src, tableRead.end);
        if (src[i] !== "(") { from = idx + 1; continue; }
        const close = findMatchingParen(src, i);
        if (close < 0) { from = idx + 1; continue; }
        const colsBody = src.slice(i + 1, close);
        out.push({ name: nameRead.text, table: tableRead.text, cols: colsBody.trim() });
        from = close + 1;
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────
// load schemas/<kind>/*.sql
// ─────────────────────────────────────────────────────────────────────
function loadSchemas() {
    const result = {};
    for (const kind of DB_KINDS) {
        const dir = join(SCHEMAS_ROOT, kind);
        let files;
        try { files = readdirSync(dir).filter((f) => f.endsWith(".sql")); } catch { continue; }
        for (const f of files) {
            const src = stripSqlComments(readFileSync(join(dir, f), "utf8"));
            const tables = extractCreateTables(src);
            const indexes = extractIndexes(src);
            for (const t of tables) {
                result[t.table] = {
                    kind,
                    cols: t.cols.map((c) => ({ ...c, source: "schema" })),
                    pk: t.pk,
                    indexes: indexes.filter((ix) => ix.table === t.table),
                    sourceFile: `schemas/${kind}/${f}`,
                };
            }
        }
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────
// load saturated tables constants from saturated-tables.ts
// ─────────────────────────────────────────────────────────────────────
function loadSaturatedConstants() {
    const src = readFileSync(SATURATED_PATH, "utf8");

    function findStringLitArray(varName) {
        const i = src.indexOf(`${varName}`);
        if (i < 0) return [];
        const open = src.indexOf("[", i);
        if (open < 0) return [];
        const close = src.indexOf("]", open);
        if (close < 0) return [];
        const body = src.slice(open + 1, close);
        const out = [];
        let j = 0;
        while (j < body.length) {
            const lit = readStringLit(body, j);
            if (lit) {
                out.push(lit.text);
                j = lit.end;
                continue;
            }
            j++;
        }
        return out;
    }

    function findObjectArray(varName) {
        const i = src.indexOf(`${varName}`);
        if (i < 0) return [];
        const open = src.indexOf("[", i);
        if (open < 0) return [];
        const close = findMatchingBracket(src, open);
        if (close < 0) return [];
        const body = src.slice(open + 1, close);
        // walk objects { table: "...", rsnColumn: "...", hashColumn: "..." }
        const out = [];
        let j = 0;
        while (j < body.length) {
            if (body[j] !== "{") { j++; continue; }
            const objEnd = findMatchingBrace(body, j);
            if (objEnd < 0) break;
            const objBody = body.slice(j + 1, objEnd);
            const entry = {};
            const fields = splitTopLevelCommas(objBody);
            for (const f of fields) {
                const colon = f.indexOf(":");
                if (colon < 0) continue;
                const key = f.slice(0, colon).trim();
                const val = f.slice(colon + 1).trim();
                if (val.startsWith('"') || val.startsWith("'")) {
                    const lit = readStringLit(val, 0);
                    if (lit) entry[key] = lit.text;
                } else {
                    entry[key] = val;
                }
            }
            if (entry.table) out.push(entry);
            j = objEnd + 1;
        }
        return out;
    }

    return {
        PLUGIN_NEW_RSN_TABLES: findStringLitArray("PLUGIN_NEW_RSN_TABLES"),
        CLANSOCKET_SATURATED: findObjectArray("CLANSOCKET_SATURATED"),
        CLAN_SATURATED: findObjectArray("CLAN_SATURATED"),
    };
}

function findMatchingBracket(src, openIdx) {
    let depth = 0;
    let i = openIdx;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '"' || ch === "'") {
            const lit = readStringLit(src, i);
            if (lit) { i = lit.end; continue; }
        }
        if (ch === "[") depth++;
        else if (ch === "]") { depth--; if (depth === 0) return i; }
        i++;
    }
    return -1;
}
function findMatchingBrace(src, openIdx) {
    let depth = 0;
    let i = openIdx;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '"' || ch === "'") {
            const lit = readStringLit(src, i);
            if (lit) { i = lit.end; continue; }
        }
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) return i; }
        i++;
    }
    return -1;
}

// ─────────────────────────────────────────────────────────────────────
// find every CALL of a named function and parse its args
// returns [{idx, args: [...]}]  where args are string literals or raw expr text
// ─────────────────────────────────────────────────────────────────────
function findCalls(src, fnName) {
    const out = [];
    let from = 0;
    while (true) {
        const idx = src.indexOf(fnName, from);
        if (idx < 0) break;
        // boundary check
        const before = src[idx - 1];
        const after = src[idx + fnName.length];
        if ((idx > 0 && isIdentChar(before)) || after !== "(") {
            from = idx + 1;
            continue;
        }
        const close = findMatchingParen(src, idx + fnName.length);
        if (close < 0) break;
        const body = src.slice(idx + fnName.length + 1, close);
        const args = splitTopLevelCommas(body).map((a) => {
            const lit = readStringLit(a.trim(), 0);
            if (lit && lit.end === a.trim().length) return { kind: "string", val: lit.text };
            return { kind: "expr", val: a.trim() };
        });
        out.push({ idx, args });
        from = close + 1;
    }
    return out;
}

// find raw "DROP TABLE [IF EXISTS] X" occurrences
function findDropTables(src) {
    const out = [];
    let from = 0;
    while (true) {
        const idx = findKw(src, "DROP", from);
        if (idx < 0) break;
        let i = skipWs(src, idx + 4);
        if (!matchKwAt(src, i, "TABLE")) { from = idx + 1; continue; }
        i = skipWs(src, i + 5);
        if (matchKwAt(src, i, "IF")) {
            i = skipWs(src, i + 2);
            if (matchKwAt(src, i, "EXISTS")) i = skipWs(src, i + 6);
        }
        const ident = readIdent(src, i);
        if (!ident.text) { from = idx + 1; continue; }
        out.push({ idx, table: ident.text });
        from = ident.end;
    }
    return out;
}

// find raw "ALTER TABLE X DROP COLUMN Y" / "ALTER TABLE X RENAME TO Y"
function findAlters(src) {
    const out = [];
    let from = 0;
    while (true) {
        const idx = findKw(src, "ALTER", from);
        if (idx < 0) break;
        let i = skipWs(src, idx + 5);
        if (!matchKwAt(src, i, "TABLE")) { from = idx + 1; continue; }
        i = skipWs(src, i + 5);
        const tableIdent = readIdent(src, i);
        if (!tableIdent.text) { from = idx + 1; continue; }
        i = skipWs(src, tableIdent.end);
        if (matchKwAt(src, i, "RENAME")) {
            i = skipWs(src, i + 6);
            if (matchKwAt(src, i, "TO")) {
                i = skipWs(src, i + 2);
                const newName = readIdent(src, i);
                if (newName.text) {
                    out.push({ idx, op: "RENAME_TABLE", oldTable: tableIdent.text, newTable: newName.text });
                    from = newName.end;
                    continue;
                }
            }
        }
        if (matchKwAt(src, i, "DROP")) {
            i = skipWs(src, i + 4);
            if (matchKwAt(src, i, "COLUMN")) {
                i = skipWs(src, i + 6);
                const colIdent = readIdent(src, i);
                if (colIdent.text) {
                    out.push({ idx, op: "DROP_COL", table: tableIdent.text, col: colIdent.text });
                    from = colIdent.end;
                    continue;
                }
            }
        }
        from = idx + 1;
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────
// parse migration source → ops list (with source offsets so we apply in order)
// ─────────────────────────────────────────────────────────────────────
function parseMigration(src, saturated) {
    const ops = [];
    const SPATIAL_COLS = [
        ["world", "INTEGER"], ["x", "INTEGER"], ["y", "INTEGER"], ["plane", "INTEGER"],
        ["region_id", "INTEGER"], ["region_name", "TEXT"], ["area", "TEXT"],
    ];

    // addColumnIfMissing(db, "T", "C", "TYPE")
    for (const call of findCalls(src, "addColumnIfMissing")) {
        const [, t, c, ty] = call.args;
        if (t?.kind === "string" && c?.kind === "string" && ty?.kind === "string") {
            ops.push({ idx: call.idx, op: "ADD_COL", table: t.val, col: c.val, type: ty.val });
        }
    }

    // addTextColumnIfMissing(db, "T", "C")  OR  addTextColumnIfMissing(db, var, "C")
    for (const call of findCalls(src, "addTextColumnIfMissing")) {
        const [, tArg, cArg] = call.args;
        if (cArg?.kind !== "string") continue;
        if (tArg?.kind === "string") {
            ops.push({ idx: call.idx, op: "ADD_COL", table: tArg.val, col: cArg.val, type: "TEXT" });
        } else {
            // detect loop expansion via surrounding context
            // grab ~120 chars before to look for `for (const X of CONST)`
            const window = src.slice(Math.max(0, call.idx - 160), call.idx);
            const synthIdx = src.length + ops.length;
            let expanded = false;
            if (window.indexOf("PLUGIN_NEW_RSN_TABLES") >= 0) {
                for (const t of saturated.PLUGIN_NEW_RSN_TABLES) {
                    ops.push({ idx: synthIdx, op: "ADD_COL", table: t, col: cArg.val, type: "TEXT" });
                }
                expanded = true;
            } else if (window.indexOf("CLANSOCKET_SATURATED") >= 0) {
                for (const s of saturated.CLANSOCKET_SATURATED) {
                    ops.push({ idx: synthIdx, op: "ADD_COL", table: s.table, col: s.rsnColumn, type: "TEXT" });
                }
                expanded = true;
            } else if (window.indexOf("CLAN_SATURATED") >= 0) {
                for (const s of saturated.CLAN_SATURATED) {
                    ops.push({ idx: synthIdx, op: "ADD_COL", table: s.table, col: s.rsnColumn, type: "TEXT" });
                }
                expanded = true;
            }
            // if unexpanded, we lose the op — but we tried
        }
    }

    // addSpatialColumns(db, "T")  OR  addSpatialColumns(db, var)
    for (const call of findCalls(src, "addSpatialColumns")) {
        const tArg = call.args[1];
        if (tArg?.kind === "string") {
            for (const [c, ty] of SPATIAL_COLS) {
                ops.push({ idx: call.idx, op: "ADD_COL", table: tArg.val, col: c, type: ty });
            }
        } else {
            // loop expansion — look for local `const TABLES = [ ... ]` array
            // Find `const TABLES =` then `[ ... ]`
            const ti = src.indexOf("const TABLES");
            if (ti >= 0) {
                const lb = src.indexOf("[", ti);
                const rb = lb >= 0 ? findMatchingBracket(src, lb) : -1;
                if (lb >= 0 && rb >= 0) {
                    const body = src.slice(lb + 1, rb);
                    const tables = [];
                    let j = 0;
                    while (j < body.length) {
                        if (body[j] === '"' || body[j] === "'") {
                            const lit = readStringLit(body, j);
                            if (lit) { tables.push(lit.text); j = lit.end; continue; }
                        }
                        j++;
                    }
                    const synthIdx = src.length + ops.length;
                    for (const t of tables) {
                        for (const [c, ty] of SPATIAL_COLS) {
                            ops.push({ idx: synthIdx, op: "ADD_COL", table: t, col: c, type: ty });
                        }
                    }
                }
            }
        }
    }

    // renameColumnIfPresent(db, "T", "old", "new")
    for (const call of findCalls(src, "renameColumnIfPresent")) {
        const [, t, oldC, newC] = call.args;
        if (t?.kind === "string" && oldC?.kind === "string" && newC?.kind === "string") {
            ops.push({ idx: call.idx, op: "RENAME_COL", table: t.val, oldCol: oldC.val, newCol: newC.val });
        }
    }

    // DROP TABLE / ALTER TABLE (incl. RENAME TO + DROP COLUMN)
    for (const dt of findDropTables(src)) {
        ops.push({ idx: dt.idx, op: "DROP_TABLE", table: dt.table });
    }
    for (const al of findAlters(src)) {
        ops.push({ idx: al.idx, ...al });
    }

    // CREATE TABLE (new tables or recreations)
    for (const ct of extractCreateTables(src)) {
        ops.push({ idx: ct.startIdx, op: "CREATE_OR_RECREATE", table: ct.table, cols: ct.cols, pk: ct.pk });
    }

    ops.sort((a, b) => a.idx - b.idx);
    return ops;
}

// ─────────────────────────────────────────────────────────────────────
// apply migrations in order to schemas → effective current shape
// ─────────────────────────────────────────────────────────────────────
function applyMigrations(schemas, saturated) {
    const result = JSON.parse(JSON.stringify(schemas));

    for (const kind of DB_KINDS) {
        const dir = join(MIGRATIONS_ROOT, kind);
        let files;
        try {
            files = readdirSync(dir).filter((f) => {
                if (f.length < 4) return false;
                const a = f[0], b = f[1], c = f[2], d = f[3];
                return a >= "0" && a <= "9" && b >= "0" && b <= "9" && c >= "0" && c <= "9" && d === "-";
            }).sort();
        } catch { continue; }
        for (const f of files) {
            const src = readFileSync(join(dir, f), "utf8");
            const migrationLabel = `migrations/${kind}/${f}`;
            const ops = parseMigration(src, saturated);
            for (const op of ops) {
                if (op.op === "ADD_COL") {
                    const t = result[op.table];
                    if (!t) continue;
                    if (t.cols.some((c) => c.name === op.col)) continue;
                    t.cols.push({ name: op.col, typeAndConstraints: op.type, source: migrationLabel });
                } else if (op.op === "RENAME_COL") {
                    const t = result[op.table];
                    if (!t) continue;
                    const c = t.cols.find((cc) => cc.name === op.oldCol);
                    if (!c) continue;
                    c.name = op.newCol;
                    c.renamedFrom = op.oldCol;
                    c.source = migrationLabel;
                } else if (op.op === "DROP_COL") {
                    const t = result[op.table];
                    if (!t) continue;
                    t.cols = t.cols.filter((cc) => cc.name !== op.col);
                } else if (op.op === "DROP_TABLE") {
                    delete result[op.table];
                } else if (op.op === "RENAME_TABLE") {
                    const t = result[op.oldTable];
                    if (!t) continue;
                    result[op.newTable] = { ...t, sourceFile: t.sourceFile, recreatedBy: migrationLabel };
                    delete result[op.oldTable];
                } else if (op.op === "CREATE_OR_RECREATE") {
                    result[op.table] = {
                        kind,
                        cols: op.cols.map((c) => ({ ...c, source: migrationLabel })),
                        pk: op.pk,
                        indexes: result[op.table]?.indexes || [],
                        sourceFile: result[op.table]?.sourceFile,
                        recreatedBy: migrationLabel,
                    };
                }
            }
        }
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────
// parse checklist tree (lines between "# End-goal structure" and next "---")
// returns target[table] = { db, cols: [...] }
// ─────────────────────────────────────────────────────────────────────
function parseChecklistTree() {
    const src = readFileSync(CHECKLIST_PATH, "utf8");
    const lines = src.split("\n");
    const result = {};
    let currentDb = null;
    let inTree = false;
    for (const raw of lines) {
        if (raw.startsWith("# End-goal structure")) { inTree = true; continue; }
        if (!inTree) continue;
        if (raw.startsWith("---")) { inTree = false; continue; }
        // db marker line — find ".db" suffix following a word
        // we look for "├── X.db" or "└── X.db" pattern by hand
        const treeMarkerIdx = Math.max(raw.indexOf("├── "), raw.indexOf("└── "));
        if (treeMarkerIdx < 0) continue;
        const after = raw.slice(treeMarkerIdx + 4).trim();
        // is this a db line? endsWith ".db" or ".db" + nothing
        if (after.endsWith(".db")) {
            currentDb = after;
            continue;
        }
        // is this a table line? "<name> (<col-list>)"
        const lparen = after.indexOf("(");
        const rparen = after.lastIndexOf(")");
        if (lparen <= 0 || rparen <= lparen) continue;
        const table = after.slice(0, lparen).trim();
        const colsStr = after.slice(lparen + 1, rparen);
        const cols = colsStr.split(",").map((c) => c.trim()).filter(Boolean);
        if (table && cols.length && currentDb) {
            result[table] = { db: currentDb, cols };
        }
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────
// lifecycle classification per table
// ─────────────────────────────────────────────────────────────────────
function computeLifecycle(current, target) {
    const all = new Set([...Object.keys(current), ...Object.keys(target)]);
    const out = {};
    for (const t of all) {
        const cur = current[t];
        const tgt = target[t];
        if (!tgt) { out[t] = "DROP"; continue; }
        if (!cur) { out[t] = "NEW"; continue; }
        const curCols = new Set(cur.cols.map((c) => c.name));
        const tgtCols = new Set(tgt.cols);
        const added = [...tgtCols].filter((c) => !curCols.has(c));
        const removed = [...curCols].filter((c) => !tgtCols.has(c));
        if (added.length === 0 && removed.length === 0) out[t] = "KEEP";
        else if (removed.length === 0 && added.length > 0) out[t] = "EXTEND";
        else out[t] = "REWRITE";
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────
// db grouping — collapse plugin into plugin-<mode>.db, drop temp __new names
// ─────────────────────────────────────────────────────────────────────
function isArtifactName(name) {
    return name.endsWith("__new") || name.endsWith("_new");
}
function groupByDb(current, target, lifecycle) {
    const groups = {};
    const all = new Set([...Object.keys(current), ...Object.keys(target)]);
    for (const t of all) {
        if (isArtifactName(t)) continue;
        if (lifecycle[t] === "KEEP") continue;
        let db;
        if (target[t]) db = target[t].db;
        else {
            const kind = current[t]?.kind;
            if (kind === "plugin") db = "plugin-<mode>.db";
            else db = `${kind}.db`;
        }
        if (!groups[db]) groups[db] = [];
        groups[db].push(t);
    }
    return groups;
}

// ─────────────────────────────────────────────────────────────────────
// emit constitution doc
// ─────────────────────────────────────────────────────────────────────
function emit(current, target, lifecycle) {
    const lines = [];
    const out = (s) => lines.push(s);

    out("# SQL Schema Constitution");
    out("");
    out("Generated: 2026-05-27 | Source-of-truth for current vs target db shape");
    out("Current: schemas/**/*.sql + applied migrations/**/*.ts");
    out("Target: PLUGIN-DB-REDESIGN-CHECKLIST.md tree");
    out("");
    out("Tables with KEEP lifecycle (current shape matches target) are excluded.");
    out("");
    out("Lifecycle tags shown:");
    out("  [EXTEND]   target adds cols; existing cols unchanged");
    out("  [REWRITE]  target adds AND removes/renames cols");
    out("  [NEW]      target table absent from current");
    out("  [DROP]     current table absent from target");
    out("");
    out("---");
    out("");

    const groups = groupByDb(current, target, lifecycle);
    const dbNames = Object.keys(groups).sort();

    // Overview: per-db table list with lifecycle
    for (const db of dbNames) {
        out("═════════════════════════════════════════════════════════════════════");
        out(` OVERVIEW: ${db}`);
        out("═════════════════════════════════════════════════════════════════════");
        out("");
        const tables = groups[db].slice().sort();
        const maxLen = Math.max(...tables.map((t) => t.length));
        for (const t of tables) {
            const lc = lifecycle[t];
            const pad = " ".repeat(maxLen - t.length + 2);
            // DROP rows show the file path inline (no detail card follows)
            if (lc === "DROP") {
                let kind;
                if (db === "plugin-<mode>.db") kind = "plugin";
                else if (db === "clan.db") kind = "clan";
                else if (db === "clan_audit.db") kind = "clan_audit";
                else if (db === "clansocket.db") kind = "clansocket";
                else if (db === "discord.db") kind = "discord";
                else if (db === "varez.db") kind = "varez";
                else kind = current[t]?.kind || "unknown";
                out(`  ${t}${pad}[DROP]    schemas/${kind}/${t}.sql`);
            } else {
                out(`  ${t}${pad}[${lc}]`);
            }
        }
        out("");
    }

    out("---");
    out("");

    for (const db of dbNames) {
        for (const t of groups[db].slice().sort()) {
            emitDetail(out, t, db, current[t], target[t], lifecycle[t]);
        }
    }
    return lines.join("\n");
}

function actionLine(lc, db, table, current) {
    // Determine the schema file path
    let kind;
    if (db === "plugin-<mode>.db") kind = "plugin";
    else if (db === "clan.db") kind = "clan";
    else if (db === "clan_audit.db") kind = "clan_audit";
    else if (db === "clansocket.db") kind = "clansocket";
    else if (db === "discord.db") kind = "discord";
    else if (db === "varez.db") kind = "varez";
    else kind = current?.kind || "unknown";
    const path = `schemas/${kind}/${table}.sql`;
    if (lc === "NEW") return `ACTION: create  ${path}`;
    if (lc === "REWRITE" || lc === "EXTEND") return `ACTION: overwrite  ${path}`;
    if (lc === "DROP") return `ACTION: delete  ${path}`;
    return `ACTION: keep  ${path}`;
}

function emitDetail(out, table, db, current, target, lc) {
    // DROP tables: no detail card (overview marker is enough)
    if (lc === "DROP") return;

    out("═════════════════════════════════════════════════════════════════════");
    out(` ${table} — ${lc} — ${db}`);
    out("═════════════════════════════════════════════════════════════════════");
    out(actionLine(lc, db, table, current));
    if (current?.recreatedBy) out(`RECREATED-BY: ${current.recreatedBy}`);
    out("");

    // CURRENT block — only for REWRITE/EXTEND (NEW has no current)
    if (current && (lc === "REWRITE" || lc === "EXTEND")) {
        out("CURRENT (schemas + migrations):");
        for (const c of current.cols) {
            const src = c.source && c.source !== "schema" ? `   [${c.source}]` : "";
            const ren = c.renamedFrom ? `   [renamed from ${c.renamedFrom}]` : "";
            out(`  ${c.name.padEnd(28)} ${c.typeAndConstraints}${src}${ren}`);
        }
        if (current.pk && current.pk.length) out(`  PK: (${current.pk.join(", ")})`);
        out("");
    }

    // DIFF (REWRITE/EXTEND only)
    if (current && target && (lc === "REWRITE" || lc === "EXTEND")) {
        const curNames = new Set(current.cols.map((c) => c.name));
        const tgtNames = new Set(target.cols);
        const added = [...tgtNames].filter((c) => !curNames.has(c));
        const removed = [...curNames].filter((c) => !tgtNames.has(c));
        if (added.length || removed.length) {
            out("DIFF:");
            if (added.length) out(`  + ADDED:   ${added.join(", ")}`);
            if (removed.length) out(`  - REMOVED: ${removed.join(", ")}`);
            out("");
        }
    }

    // PK + FIELDS + INDEX — driven by tmp/field-rules.mjs where available
    const rule = rules[table];
    if (target) {
        if (rule?.pk?.length) {
            const pkSuffix = rule.pkAutoIncr ? " AUTOINCREMENT" : "";
            out(`PK: (${rule.pk.join(", ")})${pkSuffix}`);
            out("");
        }
        out("FIELDS:");
        const curByName = current ? new Map(current.cols.map((c) => [c.name, c.typeAndConstraints])) : new Map();
        for (const col of target.cols) {
            const fieldRule = rule?.fields?.[col];
            if (fieldRule) {
                out(formatFieldLine(col, fieldRule));
            } else {
                const type = curByName.get(col) || "<TYPE>";
                out(`  ${col.padEnd(28)} ${String(type).padEnd(28)} │ <TODO axis> │ <TODO src/pair>`);
            }
        }
        out("");

        if (rule?.indexes?.length) {
            out("INDEX:");
            for (const ix of rule.indexes) out(`  ${ix}`);
            out("");
        } else if (current?.indexes && current.indexes.length) {
            out("INDEX (current — refine to target):");
            for (const ix of current.indexes) {
                out(`  ${ix.name}: (${ix.cols})`);
            }
            out("");
        } else {
            out("INDEX:");
            out("  <TODO: add target indexes>");
            out("");
        }
    }
}

// Per-class plugin protocol additions documented in APPENDIX F as needed-but-not-yet-emitted.
// Auto-tagged with [plugin: PENDING] in constitution output.
const PENDING_PROTOCOL_REFERENCES = [
    "Animation.animationCategory",
    "DamageTaken.sourceKind",
    "DamageTaken.sourceId",
    "DamageTaken.sourceName",
    "Death.world",
    "Death.causeCombatLevel",
    "Death.respawnRegionName",
    "Death.respawnArea",
    "PetDrop.sourceKind",
    "PetDrop.sourceId",
    "PetDrop.sourceName",
    "Location.regionName",
    "LevelUp.levelBefore",
    "LevelUp.xpBefore",
    "LevelUp.xpGained",
    "MenuAction.targetKind",
    "FarmingPatch.cropId",
    "CollectionLogSnapshot.Item.category",
    "CollectionLogEntry.category",
    "CollectionLogEntry.sourceKind",
    "Identity.pluginVersion",
    "Identity.schemaVersion",
    "Identity.worldTypes joined",
];

function pluginStatus(rule) {
    const src = rule.src || "";
    if (!src) return "?";
    if (src.includes("[PENDING")) return "plugin: PENDING";
    for (const ref of PENDING_PROTOCOL_REFERENCES) {
        if (src.includes(ref)) return "plugin: PENDING";
    }
    if (src.includes("server-gen") || src.includes("AUTOINCREMENT")) return "server-gen";
    if (src.includes("JOIN @ write") || src.includes("JOIN against")) return "catalog-derived";
    if (src.includes("server-derived") || src.includes("(server-derived)")) return "server-derived";
    if (
        src.includes("middleware") ||
        src.includes("call site") ||
        src.includes("submission form") ||
        src.includes("approval endpoint") ||
        src.includes("endpoint dispatch") ||
        src.includes("audit-writer") ||
        src.includes("grant call") ||
        src.includes("rsn upsert call")
    ) {
        return "caller-supplied";
    }
    if (src.includes("game data sync")) return "game-data-sync";
    if (src.includes("compile-time constant")) return "compile-time";
    return "plugin: present";
}

function formatFieldLine(name, rule) {
    const namePart = name.padEnd(28);
    const typePart = (rule.type || "<TYPE>").padEnd(28);
    const parts = [];
    parts.push(rule.axis || "<TODO axis>");
    if (rule.pair) parts.push(`pair=${rule.pair}`);
    if (rule.note) parts.push(rule.note);
    if (rule.src) parts.push(`src=${rule.src}`);
    parts.push(`[${pluginStatus(rule)}]`);
    return `  ${namePart} ${typePart} │ ${parts.join(" │ ")}`;
}

// MAIN
const schemas = loadSchemas();
const saturated = loadSaturatedConstants();
const current = applyMigrations(schemas, saturated);
const target = parseChecklistTree();
const lifecycle = computeLifecycle(current, target);
process.stdout.write(emit(current, target, lifecycle));
