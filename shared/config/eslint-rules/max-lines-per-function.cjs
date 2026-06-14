/**
 * LVI/max-lines-per-function — Function-body line bound (default 25).
 * Replaces stock `max-lines-per-function`. Counts non-blank lines; comment-only lines excluded.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

function effectiveLineCount(node, sourceCode) {
    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const slice = sourceCode.lines.slice(startLine - 1, endLine);
    const commentLines = new Set();
    for (const c of sourceCode.getCommentsInside(node)) {
        for (let l = c.loc.start.line; l <= c.loc.end.line; l++) commentLines.add(l);
    }
    let count = 0;
    for (let i = 0; i < slice.length; i++) {
        const lineText = slice[i];
        const lineNo = startLine + i;
        if (lineText.trim() === "") continue;
        if (commentLines.has(lineNo)) {
            const stripped = lineText.replace(/\/\/.*$/, "").replace(/\/\*[\s\S]*?\*\//g, "");
            if (stripped.trim() === "") continue;
        }
        count++;
    }
    return count;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Max effective lines per function" },
        schema: [{
            type: "object",
            properties: {
                max: { type: "number" },
                skipBlankLines: { type: "boolean" },
                skipComments: { type: "boolean" },
            },
            additionalProperties: false,
        }],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const max = (context.options[0] && context.options[0].max) || 25;
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw) || "unknown";
        const sourceCode = context.sourceCode;
        function check(node) {
            const target = node.type === "MethodDefinition" ? node.value : node;
            const lines = effectiveLineCount(target, sourceCode);
            if (lines <= max) return;
            const t = trace(node, raw, mod);
            const name = (node.id && node.id.name) || (node.key && (node.key.name || node.key.value)) || "(anonymous function)";
            context.report({ node, messageId: "report", data: { report: build4DReport({
                rule: "max-lines-per-function",
                narrative: `${name} has ${lines} effective lines (max ${max}). Violates bounded-complexity — long functions accumulate concerns and resist extraction.`,
                graph: {
                    X: `${name} — ${lines} lines, ${max} max`,
                    Y: `every caller is coupled to a ${lines}-line implementation; refactoring touches many readers`,
                    Z: `bounded_function_size (BoundComplexityAcceptPartialCorrectness) — ${max} lines per function`,
                    W: `long functions breed bucket files and duplication when split-late forces wholesale rewrites`,
                },
                remediation: `Extract cohesive sub-functions with named roles. Each extraction should have a single concern (matches lvi/no-bucket-files at file scope, same principle at function scope).`,
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
