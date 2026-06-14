/**
 * LVI/folder-limits — Enforces bounded complexity (6 files per folder).
 * no_unlimited: cognitive overload → bounded complexity for human comprehension.
 */
const path = require("path");
const fs = require("fs");
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const folderCounts = new Map();
const reported = new Set();

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Enforce max files per folder — bounded complexity principle" },
    schema: [{ type: "object", properties: { max: { type: "number" } }, additionalProperties: false }],
    messages: { report: "{{ report }}" },
  },
  create(context) {
    const max = (context.options[0] && context.options[0].max) || 6;
    const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
    const mod = getModuleForFile(raw) || "unknown";
    const folder = path.dirname(raw).replace(/\\/g, "/");
    return {
      Program(node) {
        if (!folderCounts.has(folder)) {
          try {
            const entries = fs.readdirSync(folder).filter((e) => {
              const ext = path.extname(e).toLowerCase();
              return [".js", ".ts", ".cjs", ".mjs", ".jsx", ".tsx"].includes(ext);
            });
            folderCounts.set(folder, entries.length);
          } catch { return; }
        }
        const count = folderCounts.get(folder);
        if (count <= max || reported.has(folder)) return;
        reported.add(folder);
        const t = trace(node, raw, mod);
        const short = folder.split("/src/").pop() || folder.split("/main/").pop() || folder;
        context.report({ node, messageId: "report", data: { report: build4DReport({
          rule: "folder-limits",
          narrative: `${short}/ has ${count} source files (max ${max}). Violates no_unlimited — flat directories with too many files destroy discoverability. Group related files into subdirectories by semantic concern.`,
          graph: {
            X: `${short}/ — ${count} files, ${max} max`,
            Y: `every file in this folder competes for attention — new contributors can't find where things belong`,
            Z: `no_unlimited (BoundComplexityAcceptPartialCorrectness) — 6 files per folder`,
            W: `discoverability degrades linearly — each new file makes all siblings harder to find`,
          },
          remediation: `Create subdirectories in ${short}/ by semantic grouping. Move related files together. Update imports to reflect new paths. Each subdirectory should represent one bounded concern.`,
          trace: t,
        }) } });
      },
    };
  },
};
