/**
 * LVI/file-limits — Enforces bounded complexity (150 lines).
 * no_unlimited: cognitive overload → bounded complexity for human comprehension.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Enforce max file length — bounded complexity principle" },
    schema: [{ type: "object", properties: { max: { type: "number" } }, additionalProperties: false }],
    messages: { report: "{{ report }}" },
  },
  create(context) {
    const max = (context.options[0] && context.options[0].max) || 150;
    const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
    const mod = getModuleForFile(raw) || "unknown";
    return {
      "Program:exit"(node) {
        const lines = context.sourceCode ? context.sourceCode.lines.length : node.loc.end.line;
        if (lines <= max) return;
        const t = trace(node, raw, mod);
        context.report({ node, messageId: "report", data: { report: build4DReport({
          rule: "file-limits",
          narrative: `${t.file} has ${lines} lines (max ${max}). Violates no_unlimited — bounded complexity exists because human comprehension is a design parameter, not a suggestion. This file contains more than one concern.`,
          graph: {
            X: `${t.file} — ${lines} lines, ${max} max`,
            Y: `every consumer of this file's exports is coupled to a ${lines}-line module`,
            Z: `no_unlimited (BoundComplexityAcceptPartialCorrectness) — 150 lines per file`,
            W: `merge conflicts, cognitive overload, mixed concerns compound with every addition`,
          },
          remediation: `Split ${t.file} by concern. Identify the distinct responsibilities, extract each to its own file (each under ${max} lines). Use barrel exports (index.js/ts) to preserve the public API. SRP: one file, one reason to change.`,
          trace: t,
        }) } });
      },
    };
  },
};
