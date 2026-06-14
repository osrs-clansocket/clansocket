/**
 * LVI/no-unused-vars — 3-tier unused declaration check.
 * no_implicit: hidden retention → explicit retention (observable ownership).
 * Every declaration must be justified: private, wired, or deleted.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow unused variables — 3-tier remediation (private / wire / delete)" },
    schema: [],
    messages: { report: "{{ report }}" },
  },
  create(context) {
    const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
    const mod = getModuleForFile(raw);
    const declared = new Map();
    const referenced = new Set();

    function record(node, name, kind) {
      if (name.startsWith("#")) return;
      declared.set(name, { node, kind, loc: node.loc.start });
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type === "Identifier") record(node.id, node.id.name, "variable");
        if (node.id.type === "ObjectPattern") {
          for (const prop of node.id.properties) {
            if (prop.type === "Property" && prop.value.type === "Identifier") record(prop.value, prop.value.name, "destructured variable");
          }
        }
      },
      FunctionDeclaration(node) { if (node.id) record(node.id, node.id.name, "function"); },
      ClassDeclaration(node) { if (node.id) record(node.id, node.id.name, "class"); },
      ImportSpecifier(node) { record(node.local, node.local.name, "import"); },
      ImportDefaultSpecifier(node) { record(node.local, node.local.name, "import"); },
      ImportNamespaceSpecifier(node) { record(node.local, node.local.name, "import"); },
      Identifier(node) {
        if (
          (node.parent.type === "VariableDeclarator" && node.parent.id === node) ||
          (node.parent.type === "FunctionDeclaration" && node.parent.id === node) ||
          (node.parent.type === "ClassDeclaration" && node.parent.id === node) ||
          (node.parent.type === "ImportSpecifier" && node.parent.local === node) ||
          node.parent.type === "ImportDefaultSpecifier" ||
          node.parent.type === "ImportNamespaceSpecifier" ||
          (node.parent.type === "Property" && node.parent.value === node && node.parent.parent.type === "ObjectPattern")
        ) return;
        referenced.add(node.name);
      },
      ExportNamedDeclaration(node) {
        if (node.specifiers) for (const s of node.specifiers) referenced.add(s.local.name);
        if (node.declaration) {
          const d = node.declaration;
          if ((d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") && d.id) {
            referenced.add(d.id.name);
          } else if (d.type === "VariableDeclaration") {
            for (const decl of d.declarations) {
              if (decl.id.type === "Identifier") referenced.add(decl.id.name);
              if (decl.id.type === "ObjectPattern") {
                for (const prop of decl.id.properties) {
                  if (prop.type === "Property" && prop.value.type === "Identifier") referenced.add(prop.value.name);
                }
              }
            }
          } else if (d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration" || d.type === "TSEnumDeclaration") {
            if (d.id) referenced.add(d.id.name);
          }
        }
      },
      ExportDefaultDeclaration(node) {
        if (!node.declaration) return;
        const d = node.declaration;
        if (d.type === "Identifier") referenced.add(d.name);
        else if ((d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") && d.id) referenced.add(d.id.name);
      },
      "Program:exit"() {
        for (const [name, info] of declared) {
          if (referenced.has(name)) continue;
          const t = trace(info.node, raw, mod);
          context.report({ node: info.node, messageId: "report", data: { report: build4DReport({
            rule: "no-unused-vars",
            narrative: `Unused ${info.kind} "${name}". Violates no_implicit — every declaration must have observable consumption. An unused declaration is either: (1) meant to be private, (2) forgotten wiring, or (3) dead weight. There is no fourth option.`,
            graph: {
              X: `${t.file}:${t.line} — ${info.kind} "${name}" declared but never referenced`,
              Y: `nothing depends on "${name}" — it has zero consumers in this module`,
              Z: `no_implicit (MakeRetentionExplicit) — declarations without consumption are hidden retention`,
              W: `dead code obscures intent, inflates surface area, misleads about what the module does`,
            },
            remediation: `3-tier check for "${name}" at ${t.file}:${t.line}: (1) Private? Mark with # prefix — #${name}. (2) Architectural value? Wire it — import where needed, call it, consume it. (3) Neither? Delete it. No underscore prefix. No keeping it around.`,
            trace: t,
          }) } });
        }
      },
    };
  },
};
