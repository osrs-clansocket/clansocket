/**
 * LVI/no-magic-numbers — Bans unnamed numeric literals.
 * Options: ignore[], ignoreArrayIndexes, ignoreDefaultValues.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

function resolveValue(node) {
    if (node.parent && node.parent.type === "UnaryExpression" && node.parent.operator === "-") {
        return { value: -node.value, target: node.parent };
    }
    return { value: node.value, target: node };
}

function isArrayIndex(target) {
    const p = target.parent;
    return p && p.type === "MemberExpression" && p.computed && p.property === target;
}

function isDefaultValue(target) {
    const p = target.parent;
    return p && p.type === "AssignmentPattern" && p.right === target;
}

function isInConstDeclarator(target) {
    let p = target.parent;
    while (p) {
        if (p.type === "VariableDeclarator") {
            const decl = p.parent;
            return decl && decl.type === "VariableDeclaration" && decl.kind === "const";
        }
        if (p.type === "FunctionDeclaration" || p.type === "FunctionExpression" || p.type === "ArrowFunctionExpression") return false;
        if (p.type === "BlockStatement") return false;
        p = p.parent;
    }
    return false;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "No unnamed numeric literals" },
        schema: [{
            type: "object",
            properties: {
                ignore: { type: "array", items: { type: "number" } },
                ignoreArrayIndexes: { type: "boolean" },
                ignoreDefaultValues: { type: "boolean" },
            },
            additionalProperties: false,
        }],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const opts = context.options[0] || {};
        const ignore = new Set(opts.ignore || [-1, 0, 1, 2]);
        const ignoreArrayIndexes = opts.ignoreArrayIndexes !== false;
        const ignoreDefaultValues = opts.ignoreDefaultValues !== false;
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw) || "unknown";
        return {
            Literal(node) {
                if (typeof node.value !== "number") return;
                const { value, target } = resolveValue(node);
                if (ignore.has(value)) return;
                if (ignoreArrayIndexes && isArrayIndex(target)) return;
                if (ignoreDefaultValues && isDefaultValue(target)) return;
                if (isInConstDeclarator(target)) return;
                const t = trace(node, raw, mod);
                context.report({ node, messageId: "report", data: { report: build4DReport({
                    rule: "no-magic-numbers",
                    narrative: `Numeric literal ${value} appears inline. Violates named-constant principle — magic numbers carry no documentation and resist refactor.`,
                    graph: {
                        X: `literal ${value} at ${t.file}:${t.line}`,
                        Y: `consumers reading the call site cannot infer the meaning; refactors miss all sibling occurrences`,
                        Z: `named_constant (PrincipleSelfDocumenting) — every magic number is a missing identifier`,
                        W: `duplicated unnamed numbers breed inconsistency when one site updates and others dont`,
                    },
                    remediation: `Extract to a named const at the top of the file (or in shared/constants/ if used 2+ files). Allowed defaults: \`-1\` / \`0\` / \`1\` / \`2\`, array indexes, and parameter defaults.`,
                    trace: t,
                }) } });
            },
        };
    },
};
