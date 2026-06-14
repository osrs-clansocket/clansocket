/**
 * LVI/max-depth — Enforces max nested control-flow depth (default 3).
 * Replaces stock `max-depth`. Counts if / for / while / switch / try nests within the enclosing function.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const NESTING_TYPES = new Set([
    "IfStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    "WhileStatement",
    "DoWhileStatement",
    "SwitchStatement",
    "TryStatement",
]);
const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function depthOf(node) {
    let d = 0;
    let p = node.parent;
    while (p && !FUNCTION_TYPES.has(p.type)) {
        if (NESTING_TYPES.has(p.type)) d++;
        p = p.parent;
    }
    return d;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Max control-flow nesting depth" },
        schema: [{ type: "object", properties: { max: { type: "number" } }, additionalProperties: false }],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const max = (context.options[0] && context.options[0].max) || 3;
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw) || "unknown";
        function check(node) {
            const d = depthOf(node) + 1;
            if (d <= max) return;
            const t = trace(node, raw, mod);
            context.report({ node, messageId: "report", data: { report: build4DReport({
                rule: "max-depth",
                narrative: `Control flow nested ${d} levels deep (max ${max}). Violates bounded-complexity — deep nesting signals missing extraction or early return.`,
                graph: {
                    X: `${t.context} — ${d} nest levels, ${max} max`,
                    Y: `each level is a branch consumers must reason about; depth-N has 2^N implicit paths`,
                    Z: `bounded_nesting (BoundComplexityAcceptPartialCorrectness) — ${max} nests per function`,
                    W: `deep nests breed off-by-one bugs and resist extraction; readers track shrinking context windows`,
                },
                remediation: `Apply early-return guards. Extract inner blocks into named functions. Flatten with intermediate variables.`,
                trace: t,
            }) } });
        }
        const handlers = {};
        for (const type of NESTING_TYPES) handlers[type] = check;
        return handlers;
    },
};
