"use strict";

const path = require("path");
const { getSchemaCols } = require("./schema-columns.cjs");

const SYNTHETIC_TABLES = new Set(["localStorage", "sessionStorage"]);
const COLUMNS_ARG_INDEX = 2;

function keyName(key) {
    if (!key) return null;
    if (key.type === "Identifier") return key.name;
    if (key.type === "Literal") return String(key.value);
    return null;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Validate that every column referenced in data-rights TABLE_META exists in that table's schema (database/schemas/**/*.sql). Stops row-label drift: when a schema column is renamed, a stale TABLE_META reference silently renders a blank label. Self-gated to dom/data-rights/table-meta.ts.",
        },
        schema: [],
        messages: {
            unknownColumn:
                'TABLE_META["{{table}}"] references column "{{col}}" that does not exist in the schema for "{{table}}". Update the reference to the real column or fix the schema.',
            unknownTable:
                'TABLE_META["{{table}}"] is not a known db table (no schema found) and not a synthetic pseudo-table. Fix the table key or add it to the synthetic allowlist in no-undefined-column.cjs.',
        },
    },
    create(context) {
        const filename = context.filename || (context.getFilename && context.getFilename());
        if (!filename) return {};
        if (!filename.split(path.sep).join("/").endsWith("/data-rights/table-meta.ts")) return {};
        const cols = getSchemaCols();
        if (cols.size === 0) return {};

        return {
            Property(node) {
                const value = node.value;
                if (!value || value.type !== "CallExpression") return;
                if (!value.callee || value.callee.type !== "Identifier" || value.callee.name !== "entry") return;
                const table = keyName(node.key);
                if (!table) return;
                if (SYNTHETIC_TABLES.has(table)) return;
                const tableCols = cols.get(table);
                if (!tableCols) {
                    context.report({ loc: node.key.loc, messageId: "unknownTable", data: { table } });
                    return;
                }
                const arr = value.arguments[COLUMNS_ARG_INDEX];
                if (!arr || arr.type !== "ArrayExpression") return;
                for (const el of arr.elements) {
                    if (!el || el.type !== "Literal" || typeof el.value !== "string") continue;
                    if (!tableCols.has(el.value)) {
                        context.report({ loc: el.loc, messageId: "unknownColumn", data: { table, col: el.value } });
                    }
                }
            },
        };
    },
};
