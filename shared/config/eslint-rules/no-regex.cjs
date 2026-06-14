/**
 * LVI/no-regex — Bans regex. Enforces no_separation principle.
 * Regex separates pattern from structure. AST and token-based detection keep them unified.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Ban regex — enforces homoiconicity of pattern matching" },
    schema: [],
    messages: { report: "{{ report }}" },
  },
  create(context) {
    const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
    const mod = getModuleForFile(raw);
    return {
      Literal(node) {
        if (!node.regex) return;
        const p = `/${node.regex.pattern}/${node.regex.flags}`;
        const t = trace(node, raw, mod);
        context.report({ node, messageId: "report", data: { report: build4DReport({
          rule: "no-regex",
          narrative: `Regex ${p} violates no_separation. Pattern matching in this codebase uses string methods, charCodeAt scanning, or AST traversal — never regex. Regex encodes logic as opaque syntax that can't be statically analyzed or traced.`,
          graph: {
            X: `${t.file}:${t.line} — regex literal in ${t.context}`,
            Y: `callers depend on this match being correct — regex provides zero compile-time proof`,
            Z: `no_separation (homoiconicity) — pattern is separated from the structure it matches`,
            W: `silent mismatch — if this regex is wrong, nothing catches it until runtime data doesn't match`,
          },
          remediation: `Remove ${p} at ${t.file}:${t.line}. For substring checks: includes(), startsWith(), endsWith(). For character parsing: charCodeAt() loop. For decomposition: split(). For structural matching: AST traversal. The replacement must be explicit and traceable.`,
          trace: t,
        }) } });
      },
      NewExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "RegExp") return;
        const arg = node.arguments[0];
        let p = "dynamic";
        if (arg && arg.type === "Literal") p = String(arg.value);
        const t = trace(node, raw, mod);
        context.report({ node, messageId: "report", data: { report: build4DReport({
          rule: "no-regex",
          narrative: `new RegExp(${p}) — dynamic regex construction. The pattern is a string with zero syntax validation until runtime. Combines no_separation with no_implicit: hidden pattern, hidden failure mode.`,
          graph: {
            X: `${t.file}:${t.line} — RegExp constructor in ${t.context}`,
            Y: `string → regex compilation at runtime — no static analysis path exists`,
            Z: `no_separation + no_implicit — pattern opaque to tooling and developers`,
            W: `malformed pattern string throws at runtime — no prior warning, no trace`,
          },
          remediation: `Remove new RegExp() at ${t.file}:${t.line}. Identify what it matches, implement with string methods or charCodeAt(). Every match path must be explicit.`,
          trace: t,
        }) } });
      },
    };
  },
};
