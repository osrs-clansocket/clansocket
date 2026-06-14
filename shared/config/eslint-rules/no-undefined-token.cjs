"use strict";

const fs = require("fs");
const path = require("path");

let DECLARED = null;
let STYLES_ROOT = null;

let ALLOWLIST = null;
function getAllowlist() {
    if (ALLOWLIST === null) {
        try {
            const entries = require("./no-undefined-token.allowlist.cjs");
            ALLOWLIST = new Set(entries.map((e) => e.name));
        } catch {
            ALLOWLIST = new Set();
        }
    }
    return ALLOWLIST;
}

function findStylesRoot() {
    let dir = __dirname;
    for (let i = 0; i < 6; i += 1) {
        const candidate = path.join(dir, "main", "dashboard", "src", "styles");
        if (fs.existsSync(candidate)) return candidate;
        dir = path.dirname(dir);
    }
    return null;
}

function childrenArray(listLike) {
    if (!listLike) return [];
    if (Array.isArray(listLike)) return listLike;
    if (typeof listLike.toArray === "function") return listLike.toArray();
    return [...listLike];
}

// The declared-token universe: every `--X` defined under tokens/ or auto-gen/,
// plus every `@property --X` registration anywhere under styles/.
function buildDeclaredSet() {
    const styles = STYLES_ROOT || findStylesRoot();
    STYLES_ROOT = styles;
    const declared = new Set();
    if (!styles) return declared;
    let cssTree;
    try {
        cssTree = require("css-tree");
    } catch {
        return declared;
    }

    function relOf(full) {
        return path.relative(styles, full).split(path.sep).join("/");
    }

    function collectFromFile(full, rel) {
        const isDeclarationSource = rel.startsWith("tokens/") || rel.startsWith("auto-gen/");
        const text = fs.readFileSync(full, "utf8");
        let ast;
        try {
            ast = cssTree.parse(text, { positions: true, parseCustomProperty: true });
        } catch {
            return;
        }
        cssTree.walk(ast, (node) => {
            if (node.type === "Atrule" && node.name === "property" && node.prelude) {
                const name = String(node.prelude.value || "").trim();
                if (name.startsWith("--")) declared.add(name);
                return;
            }
            if (!isDeclarationSource) return;
            if (node.type !== "Declaration") return;
            if (typeof node.property === "string" && node.property.startsWith("--")) {
                declared.add(node.property);
            }
        });
    }

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.name.endsWith(".css")) continue;
            collectFromFile(full, relOf(full));
        }
    }
    walk(styles);
    return declared;
}

function getDeclaredSet() {
    if (DECLARED === null) DECLARED = buildDeclaredSet();
    return DECLARED;
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
                "Every var(--X) use must resolve to an --X declared under styles/tokens/ or styles/auto-gen/ (or a @property registration). Closes the reference-side gap: no-raw-sizes bans raw literals but trusts any var name; no-mixed-css-scopes validates where tokens are defined; nothing validated that a var USE points at a real token. Dangling refs (typos, drops-after-rename, cross-concern misuse) silently fall back at runtime.",
            url: "https://github.com/banesLab/ClanSocket/blob/main/CLAUDE.md",
        },
        schema: [],
        messages: {
            undefinedToken:
                'var({{name}}) does not resolve to any token declared under styles/tokens/ or styles/auto-gen/. Declare the token in the matching tokens/<concern>/ file, fix the name, or — only for a runtime/JS-injected var — add it to no-undefined-token.allowlist.cjs with a reason.',
        },
    },
    create(context) {
        const declared = getDeclaredSet();
        if (declared.size === 0) return {};
        const allow = getAllowlist();
        const sourceCode = context.sourceCode || (context.getSourceCode && context.getSourceCode());
        const cssTree = (() => { try { return require("css-tree"); } catch { return null; } })();
        if (!cssTree) return {};

        function reportUndefinedVars(valueNode) {
            const valRange = rangeOf(valueNode, sourceCode);
            if (!valRange) return;
            const valText = sourceCode ? sourceCode.text.slice(valRange[0], valRange[1]) : "";
            if (!valText) return;

            let parsed;
            try {
                parsed = cssTree.parse(valText, { context: "value", positions: true, parseCustomProperty: true });
            } catch {
                return;
            }
            const baseOffset = valRange[0];

            cssTree.walk(parsed, (n) => {
                if (n.type !== "Function" || n.name !== "var") return;
                const args = childrenArray(n.children);
                if (args.length === 0) return;
                const id = args[0];
                if (!id || id.type !== "Identifier" || !id.name || !id.name.startsWith("--")) return;
                if (declared.has(id.name) || allow.has(id.name)) return;
                if (!id.loc || !id.loc.start || !id.loc.end) return;
                const start = baseOffset + id.loc.start.offset;
                const end = baseOffset + id.loc.end.offset;
                context.report({
                    loc: {
                        start: sourceCode.getLocFromIndex ? sourceCode.getLocFromIndex(start) : valueNode.loc.start,
                        end: sourceCode.getLocFromIndex ? sourceCode.getLocFromIndex(end) : valueNode.loc.end,
                    },
                    messageId: "undefinedToken",
                    data: { name: id.name },
                });
            });
        }

        return {
            Declaration(node) {
                if (!node.value) return;
                reportUndefinedVars(node.value);
            },
        };
    },
};
