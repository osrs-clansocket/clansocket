/**
 * LVI/max-params — Enforces parameter-count bound per function (default 4).
 * Replaces stock `max-params` to emit 4D-graph reports under the lvi/ namespace.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Max parameter count per function" },
        schema: [{ type: "object", properties: { max: { type: "number" } }, additionalProperties: false }],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const max = (context.options[0] && context.options[0].max) || 4;
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw) || "unknown";
        function check(node) {
            const n = node.params.length;
            if (n <= max) return;
            const t = trace(node, raw, mod);
            const name = (node.id && node.id.name) || "(anonymous function)";
            context.report({ node, messageId: "report", data: { report: build4DReport({
                rule: "max-params",
                narrative: `${name} has ${n} parameters (max ${max}). Violates bounded-arity — functions with >${max} params hide a missing options-object or split concern.`,
                graph: {
                    X: `${name} — ${n} params, ${max} max`,
                    Y: `every caller must pass all ${n} positional args; refactoring one bleeds through every call site`,
                    Z: `bounded_arity (BoundComplexityAcceptPartialCorrectness) — ${max} params per function`,
                    W: `signature drift cascades; param order becomes implicit knowledge`,
                },
                remediation: `Group related params into a single options object (\`{ a, b, c }\`). Split unrelated params into separate functions. Each param should be load-bearing for the function's core concern.`,
                trace: t,
            }) } });
        }
        return {
            FunctionDeclaration: check,
            FunctionExpression: check,
            ArrowFunctionExpression: check,
        };
    },
};
