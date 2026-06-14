"use strict";

const { getSchemaCols, stripQuotes } = require("./schema-columns.cjs");

const KNOWN_PREFIXES = ["plugin_", "clansocket_", "clan_", "discord_", "varez_"];
const NON_COLUMN_LIST = new Set(["VALUES", "SELECT", "DEFAULT"]);
const WS = " \t\n\r";
const BREAK = " \t\n\r(),;=";

function isIdent(s) {
    if (s.length === 0) return false;
    for (const ch of s) {
        const ok =
            (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_";
        if (!ok) return false;
    }
    return true;
}

function sqlOf(arg) {
    if (!arg) return null;
    if (arg.type === "Literal" && typeof arg.value === "string") return arg.value;
    if (arg.type === "TemplateLiteral" && arg.expressions.length === 0 && arg.quasis.length === 1) {
        return arg.quasis[0].value.cooked;
    }
    return null;
}

function skipWs(sql, i) {
    let j = i;
    while (j < sql.length && WS.includes(sql[j])) j += 1;
    return j;
}

function readToken(sql, i) {
    const start = skipWs(sql, i);
    let j = start;
    while (j < sql.length && !BREAK.includes(sql[j])) j += 1;
    return { token: sql.slice(start, j), next: j, at: start };
}

function parenContent(sql, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < sql.length; i += 1) {
        if (sql[i] === "(") depth += 1;
        else if (sql[i] === ")") {
            depth -= 1;
            if (depth === 0) return sql.slice(openIdx + 1, i);
        }
    }
    return null;
}

function splitTopLevel(s) {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < s.length; i += 1) {
        const c = s[i];
        if (c === "(") depth += 1;
        else if (c === ")") depth -= 1;
        else if (c === "," && depth === 0) {
            out.push(s.slice(start, i));
            start = i + 1;
        }
    }
    out.push(s.slice(start));
    return out;
}

// columns named in an INSERT column-list: `INSERT INTO t (a, b, c) ...`
function insertColumns(sql, afterTable) {
    const i = skipWs(sql, afterTable);
    if (sql[i] !== "(") return [];
    const content = parenContent(sql, i);
    if (content === null) return [];
    return splitTopLevel(content).map((p) => stripQuotes(p.trim()));
}

// columns assigned in a SET clause (UPDATE, or upsert DO UPDATE SET): `SET a = ?, b = ?`
function setColumns(sql, upper) {
    const setIdx = upper.indexOf(" SET ");
    if (setIdx === -1) return [];
    const start = setIdx + " SET ".length;
    let end = upper.indexOf(" WHERE ", start);
    if (end === -1) end = sql.length;
    return splitTopLevel(sql.slice(start, end)).map((seg) => {
        const eq = seg.indexOf("=");
        return stripQuotes((eq === -1 ? seg : seg.slice(0, eq)).trim());
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Validate that table + column names in static INSERT/UPDATE SQL passed to .prepare() exist in the schema (database/schemas/**/*.sql). Catches silent write drift when a column is renamed/typo'd. Conservative: only static SQL (no template interpolation), only INSERT column-lists + UPDATE/upsert SET columns; dynamic SQL and SELECT/DELETE are skipped.",
        },
        schema: [],
        messages: {
            unknownColumn:
                'SQL writes column "{{col}}" to "{{table}}", which has no such column in the schema. Fix the column name or the schema.',
            unknownTable: 'SQL writes to "{{table}}", which has no schema (database/schemas/**). Fix the table name.',
        },
    },
    create(context) {
        const cols = getSchemaCols();
        if (cols.size === 0) return {};

        function report(node, messageId, data) {
            context.report({ loc: node.loc, messageId, data });
        }

        function checkColumns(node, table, tableCols, names) {
            for (const raw of names) {
                if (!isIdent(raw)) continue;
                if (!tableCols.has(raw)) report(node, "unknownColumn", { table, col: raw });
            }
        }

        function validate(node, sql) {
            const upper = sql.toUpperCase();
            const lead = readToken(sql, 0).token.toUpperCase();
            const isInsert = lead === "INSERT";
            const isUpdate = lead === "UPDATE";
            if (!isInsert && !isUpdate) return;

            const after = isInsert ? upper.indexOf("INTO") + "INTO".length : readToken(sql, 0).next;
            let t = readToken(sql, after);
            if (isUpdate && t.token.toUpperCase() === "OR") {
                const action = readToken(sql, t.next);
                t = readToken(sql, action.next);
            }
            const table = stripQuotes(t.token);
            const tableCols = cols.get(table);
            if (!tableCols) {
                if (KNOWN_PREFIXES.some((p) => table.startsWith(p))) report(node, "unknownTable", { table });
                return;
            }
            if (isInsert) {
                const nextTok = readToken(sql, t.next).token.toUpperCase();
                if (!NON_COLUMN_LIST.has(nextTok)) checkColumns(node, table, tableCols, insertColumns(sql, t.next));
            }
            checkColumns(node, table, tableCols, setColumns(sql, upper));
        }

        return {
            CallExpression(node) {
                const callee = node.callee;
                if (!callee || callee.type !== "MemberExpression") return;
                if (!callee.property || callee.property.name !== "prepare") return;
                const sql = sqlOf(node.arguments[0]);
                if (sql === null) return;
                validate(node.arguments[0], sql);
            },
        };
    },
};
