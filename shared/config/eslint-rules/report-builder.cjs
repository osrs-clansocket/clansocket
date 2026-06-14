const { getModuleForFile, getModuleConfig } = require("../resolve-paths.cjs");

function build4DReport({ rule, narrative, graph, remediation, trace }) {
  const pad = Math.max(0, 52 - rule.length);
  const lines = [
    "",
    `── LVI/${rule} ${"─".repeat(pad)}`,
    "",
    `  ${narrative}`,
    "",
    `  X  ${graph.X}`,
    `  Y  ${graph.Y}`,
    `  Z  ${graph.Z}`,
    `  W  ${graph.W}`,
    "",
    `  ${remediation}`,
    "",
    `  at ${trace.file}:${trace.line}:${trace.col}`,
    `  in ${trace.context} [${trace.module}]`,
  ];

  if (trace.related && trace.related.length > 0) {
    for (const ref of trace.related) {
      lines.push(`  → ${ref}`);
    }
  }

  lines.push(`${"─".repeat(58)}`);
  return lines.join("\n");
}

function getContext(node) {
  let p = node.parent;
  while (p) {
    if (p.type === "FunctionDeclaration" && p.id) return p.id.name + "()";
    if (p.type === "VariableDeclarator" && p.id && p.id.name) return p.id.name;
    if (p.type === "MethodDefinition" && p.key) return p.key.name + "()";
    if (p.type === "Property" && p.key) return (p.key.name || p.key.value || "") + "()";
    p = p.parent;
  }
  return "module scope";
}

function shortFile(raw) {
  return raw.split("/src/").pop() || raw.split("/main/").pop() || raw.split("/").pop() || raw;
}

function moduleFile(raw) {
  const mod = getModuleForFile(raw);
  const config = mod ? getModuleConfig(mod) : null;
  const root = config?.root || "";
  const short = shortFile(raw);
  return root ? `${root}/${short}` : short;
}

function trace(node, raw, mod) {
  const modName = mod || getModuleForFile(raw) || "unknown";
  const config = modName !== "unknown" ? getModuleConfig(modName) : null;
  const root = config?.root || "";
  const short = shortFile(raw);
  return {
    file: root ? `${root}/${short}` : short,
    line: String(node.loc.start.line),
    col: String(node.loc.start.column),
    context: getContext(node),
    module: modName,
    related: [],
  };
}

module.exports = { build4DReport, getContext, shortFile, moduleFile, trace };
