"use strict";

const fs = require("fs");
const path = require("path");

let RESOLVED_ALIASES = null;
let STYLES_ROOT = null;

function findStylesRoot() {
    let dir = __dirname;
    for (let i = 0; i < 6; i += 1) {
        const candidate = path.join(dir, "main", "dashboard", "src", "styles");
        if (fs.existsSync(candidate)) return candidate;
        dir = path.dirname(dir);
    }
    return null;
}

function isExemptForAliasScan(relPath) {
    if (relPath.startsWith("auto-gen/")) return true;
    if (relPath.startsWith("icons/")) return true;
    if (relPath === "icons.css" || relPath === "prism.css") return true;
    if (relPath.endsWith("/index.css") || relPath === "index.css") return true;
    return false;
}

function childrenArray(listLike) {
    if (!listLike) return [];
    if (Array.isArray(listLike)) return listLike;
    if (typeof listLike.toArray === "function") return listLike.toArray();
    return [...listLike];
}

function buildAliasMap() {
    const styles = STYLES_ROOT || findStylesRoot();
    STYLES_ROOT = styles;
    if (!styles) return new Map();
    let cssTree;
    try {
        cssTree = require("css-tree");
    } catch {
        return new Map();
    }
    const oneHop = new Map();

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            const rel = path.relative(styles, full).split(path.sep).join("/");
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.name.endsWith(".css")) continue;
            if (isExemptForAliasScan(rel)) continue;

            const text = fs.readFileSync(full, "utf8");
            let ast;
            try {
                ast = cssTree.parse(text, { positions: true, parseCustomProperty: true });
            } catch {
                continue;
            }

            cssTree.walk(ast, (node) => {
                if (node.type !== "Declaration") return;
                if (!node.property.startsWith("--")) return;
                const valChildren = childrenArray(node.value && node.value.children);
                if (valChildren.length !== 1) return;
                const fn = valChildren[0];
                if (fn.type !== "Function" || fn.name !== "var") return;
                const args = childrenArray(fn.children);
                if (args.length === 0) return;
                const id = args[0];
                if (id.type !== "Identifier" || !id.name || !id.name.startsWith("--")) return;
                oneHop.set(node.property, id.name);
            });
        }
    }
    walk(styles);

    const resolved = new Map();
    for (const [src] of oneHop) {
        const visited = new Set();
        let cur = src;
        while (oneHop.has(cur) && !visited.has(cur)) {
            visited.add(cur);
            cur = oneHop.get(cur);
        }
        resolved.set(src, cur);
    }
    return resolved;
}

function getAliasMap() {
    if (RESOLVED_ALIASES === null) RESOLVED_ALIASES = buildAliasMap();
    return RESOLVED_ALIASES;
}

function rangeOf(node, sourceCode) {
    if (sourceCode && typeof sourceCode.getRange === "function") return sourceCode.getRange(node);
    if (node.loc && node.loc.start && node.loc.end) return [node.loc.start.offset, node.loc.end.offset];
    return null;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Ban single-var alias declarations (`--X: var(--Y);`). Detect-only. Resolution is handled by `scripts/codemod/resolve-css-aliases-script.mjs` which does cross-file AST-driven replacement in a single deterministic pass (walks every var() including fallback args).",
        },
        schema: [],
        messages: {
            aliasDecl:
                "Alias declaration `{{name}}: var({{target}});` not allowed. Run `node scripts/codemod/resolve-css-aliases-script.mjs` to replace every `var({{name}})` site with `var({{resolved}})` and remove this declaration.",
            aliasUse:
                "`var({{name}})` aliases through to `var({{resolved}})`. Run `node scripts/codemod/resolve-css-aliases-script.mjs` to resolve.",
        },
    },
    create(context) {
        const aliasMap = getAliasMap();
        if (aliasMap.size === 0) return {};
        const sourceCode = context.sourceCode || (context.getSourceCode && context.getSourceCode());

        const cssTree = (() => { try { return require("css-tree"); } catch { return null; } })();

        function findVarUsesInValue(valueNode) {
            const out = [];
            if (!valueNode || !cssTree) return out;
            const valRange = rangeOf(valueNode, sourceCode);
            if (!valRange) return out;
            const valText = sourceCode ? sourceCode.text.slice(valRange[0], valRange[1]) : "";
            if (!valText) return out;

            let parsed;
            try {
                parsed = cssTree.parse(valText, { context: "value", positions: true, parseCustomProperty: true });
            } catch {
                return out;
            }
            const baseOffset = valRange[0];

            cssTree.walk(parsed, (n) => {
                if (n.type !== "Function" || n.name !== "var") return;
                const args = childrenArray(n.children);
                if (args.length === 0) return;
                const id = args[0];
                if (!id || id.type !== "Identifier" || !id.name || !aliasMap.has(id.name)) return;
                const resolved = aliasMap.get(id.name);
                if (resolved === id.name) return;
                if (!id.loc || !id.loc.start || !id.loc.end) return;
                const start = baseOffset + id.loc.start.offset;
                const end = baseOffset + id.loc.end.offset;
                out.push({ start, end, replace: resolved, name: id.name });
            });
            return out;
        }

        return {
            Declaration(node) {
                const prop = node.property;

                if (typeof prop === "string" && prop.startsWith("--") && aliasMap.has(prop)) {
                    context.report({
                        loc: node.loc,
                        messageId: "aliasDecl",
                        data: { name: prop, target: aliasMap.get(prop), resolved: aliasMap.get(prop) },
                    });
                    return;
                }

                const useFixes = findVarUsesInValue(node.value);
                if (useFixes.length === 0) return;
                const seen = new Set(useFixes.map((f) => f.name));
                const firstName = [...seen][0];
                context.report({
                    loc: node.loc,
                    messageId: "aliasUse",
                    data: { name: firstName, resolved: aliasMap.get(firstName) },
                });
            },
        };
    },
};
