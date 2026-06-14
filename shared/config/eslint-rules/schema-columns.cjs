"use strict";

// Shared schema introspection for the data/SQL lint rules (no-undefined-column,
// no-undefined-sql-column). Parses database/schemas/**/*.sql into a
// table -> Set(column) map with string methods (no regex). Cached per process.

const fs = require("fs");
const path = require("path");

let CACHE = null;
let ROOT = null;

const ROOT_HOPS = 8;
const CONSTRAINT_KEYWORDS = new Set(["PRIMARY", "FOREIGN", "UNIQUE", "CONSTRAINT", "CHECK"]);

function findSchemasRoot() {
    let dir = __dirname;
    for (let i = 0; i < ROOT_HOPS; i += 1) {
        const candidate = path.join(dir, "main", "server", "src", "database", "schemas");
        if (fs.existsSync(candidate)) return candidate;
        dir = path.dirname(dir);
    }
    return null;
}

function stripLineComments(text) {
    const out = [];
    for (const line of text.split("\n")) {
        const i = line.indexOf("--");
        out.push(i === -1 ? line : line.slice(0, i));
    }
    return out.join("\n");
}

function firstToken(line) {
    const trimmed = line.trim();
    let end = 0;
    while (end < trimmed.length) {
        const ch = trimmed[end];
        if (ch === " " || ch === "\t" || ch === "(") break;
        end += 1;
    }
    return trimmed.slice(0, end);
}

function stripQuotes(name) {
    if (name.length < 2) return name;
    const a = name[0];
    const b = name[name.length - 1];
    if ((a === '"' && b === '"') || (a === "`" && b === "`") || (a === "[" && b === "]")) {
        return name.slice(1, -1);
    }
    return name;
}

function tableNameFrom(text) {
    const marker = "CREATE TABLE";
    const idx = text.toUpperCase().indexOf(marker);
    if (idx === -1) return null;
    let rest = text.slice(idx + marker.length);
    const ine = rest.toUpperCase().indexOf("IF NOT EXISTS");
    if (ine !== -1 && rest.slice(0, ine).trim().length === 0) {
        rest = rest.slice(ine + "IF NOT EXISTS".length);
    }
    return stripQuotes(firstToken(rest));
}

function parseColumns(text) {
    const open = text.indexOf("(");
    if (open === -1) return null;
    let depth = 0;
    let close = -1;
    for (let i = open; i < text.length; i += 1) {
        if (text[i] === "(") depth += 1;
        else if (text[i] === ")") {
            depth -= 1;
            if (depth === 0) {
                close = i;
                break;
            }
        }
    }
    if (close === -1) return null;
    const cols = new Set();
    for (const line of text.slice(open + 1, close).split("\n")) {
        const tok = firstToken(line);
        if (tok.length === 0) continue;
        if (CONSTRAINT_KEYWORDS.has(tok.toUpperCase())) continue;
        cols.add(stripQuotes(tok));
    }
    return cols;
}

function buildSchemaCols() {
    const root = ROOT || findSchemasRoot();
    ROOT = root;
    const map = new Map();
    if (!root) return map;
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.name.endsWith(".sql")) continue;
            const text = stripLineComments(fs.readFileSync(full, "utf8"));
            const table = tableNameFrom(text);
            const cols = parseColumns(text);
            if (table && cols) map.set(table, cols);
        }
    }
    walk(root);
    return map;
}

function getSchemaCols() {
    if (CACHE === null) CACHE = buildSchemaCols();
    return CACHE;
}

module.exports = { getSchemaCols, stripQuotes };
