/**
 * LVI/no-duplication — Detects 15 duplication types via AST analysis.
 * Each type maps to a canonical DRY compression strategy from development rules.
 * no_separation (homoiconicity) — duplicate logic separates truth into multiple locations.
 * Module-boundary aware: cross-module duplicates are allowed.
 */

const THRESHOLDS = {
  literal: 5,
  structural: 2,
  logical: 2,
  data: 2,
  behavioral: 2,
  config: 2,
  validation: 2,
  temporal: 2,
};

const STRATEGIES = {
  literal: "Function / constant extraction",
  structural: "Abstraction / composition",
  semantic: "Canonical function",
  behavioral: "Centralized orchestration",
  logical: "Predicate normalization",
  data: "Single source of truth",
  knowledge: "Schema-driven systems",
  temporal: "Parameterization",
  configurational: "Config centralization",
  interface_: "Shared contracts / schemas",
  process: "Pipeline reuse",
  conceptual: "Domain unification",
  representational: "Canonical format",
  validation: "Single validation layer",
  derivational: "Compute-on-read (when viable)",
};

const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport } = require("./report-builder.cjs");
const { hashNode, getObjKeys } = require("./duplication-hash.cjs");
const EXCLUSIONS = require("./no-duplication.exclusions.cjs");
const { collectCentralizedNames, containsCentralizedRef } = require("./dup-shared-roots.cjs");

function isExcludedFile(normPath) {
    for (const entry of EXCLUSIONS) {
        if (normPath.endsWith(entry.path)) return true;
    }
    return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Detect code duplication within module boundaries (cross-module duplicates are allowed)",
    },
    schema: [],
    messages: {
      duplication: "{{ report }}",
    },
  },

  create(context) {
    const rawFilename = (context.filename || context.getFilename()).replace(/\\/g, "/");
    const shortFile = rawFilename.split("/src/").pop() || rawFilename.split("/").pop() || rawFilename;
    if (!rawFilename.includes("/src/")) return {};
    if (isExcludedFile(rawFilename)) return {};

    const currentModule = getModuleForFile(rawFilename);
    if (!currentModule) return {};

    // ═══════════════════════════════════════
    // Collectors — gather data during traversal
    // ═══════════════════════════════════════

    const literals = new Map();         // value → [{ node, loc }]
    const funcBodies = [];              // [{ node, hash, name, loc }]
    const conditions = [];              // [{ hash, source, node, loc }]
    const objectShapes = [];            // [{ hash, keys, node, loc }]
    const eventHandlers = [];           // [{ hash, event, node, loc }]
    const validationPatterns = [];      // [{ hash, node, loc }]
    const timeouts = [];                // [{ hash, node, loc }]

    function getSource(node) {
      const src = context.sourceCode || context.getSourceCode();
      try { return src.getText(node).slice(0, 120); } catch { return ""; }
    }

    function getEnclosing(node) {
      let p = node.parent;
      while (p) {
        if (p.type === "FunctionDeclaration" && p.id) return p.id.name + "()";
        if (p.type === "VariableDeclarator" && p.id) return p.id.name;
        if (p.type === "MethodDefinition" && p.key) return p.key.name + "()";
        if (p.type === "Property" && p.key) return (p.key.name || p.key.value || "") + "()";
        p = p.parent;
      }
      return "module scope";
    }

    // ═══════════════════════════════════════
    // Report builder — 4D semantic feedback
    // ═══════════════════════════════════════

    function buildReport(type, node, details) {
      const strategy = STRATEGIES[type] || STRATEGIES.literal;
      return build4DReport({
        rule: `no-duplication/${type}`,
        narrative: `${details.what}. Violates no_separation — ${details.count} locations hold the same truth. DRY compression strategy: ${strategy}.`,
        graph: {
          X: `${shortFile} — ${details.what}`,
          Y: `${details.count} call sites depend on the same value — changing one requires finding all others`,
          Z: `no_separation (EliminateDuplicationViaSharing) — duplication type: ${type}`,
          W: `every duplicate is a divergence risk — one gets updated, the rest drift silently`,
        },
        remediation: `Apply "${strategy}" to ${shortFile}. ${details.fix}. Locations: ${details.locations}.`,
        trace: {
          file: shortFile,
          line: String(node.loc.start.line),
          col: String(node.loc.start.column),
          context: getEnclosing(node),
          module: currentModule,
          related: details.relatedFiles || [],
        },
      });
    }

    // ═══════════════════════════════════════
    // AST visitors
    // ═══════════════════════════════════════

    let centralizedNames = new Set();

    return {
      Program(node) {
        centralizedNames = collectCentralizedNames(node, rawFilename);
      },

      // ── Literal duplication ──
      Literal(node) {
        if (node.parent.type === "ImportDeclaration") return;
        if (typeof node.value === "string" && node.value.length < 8) return;
        if (typeof node.value === "number" && (node.value === 0 || node.value === 1)) return;
        const key = JSON.stringify(node.value);
        if (!literals.has(key)) literals.set(key, []);
        literals.get(key).push({ node, loc: node.loc.start });
      },

      // ── Structural duplication (function bodies) ──
      "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"(node) {
        if (!node.body) return;
        const hash = hashNode(node.body, 0);
        if (hash.length < 15) return; // skip trivial functions
        const name = node.id?.name || getEnclosing(node);
        funcBodies.push({ node, hash, name, loc: node.loc.start });
      },

      // ── Logical duplication (if conditions) ──
      IfStatement(node) {
        if (containsCentralizedRef(node.test, centralizedNames)) return;
        const hash = hashNode(node.test, 0);
        if (hash.length < 5) return;
        conditions.push({ hash, source: getSource(node.test), node: node.test, loc: node.loc.start });
      },

      // ── Data duplication (object shapes) ──
      ObjectExpression(node) {
        if (node.properties.length < 3) return;
        if (
          node.parent &&
          node.parent.type === "CallExpression" &&
          node.parent.callee.type === "Identifier" &&
          centralizedNames.has(node.parent.callee.name) &&
          node.parent.arguments[0] === node
        ) return;
        const keys = getObjKeys(node);
        const hash = keys.join(",");
        objectShapes.push({ hash, keys, node, loc: node.loc.start });
      },

      // ── Behavioral duplication (addEventListener patterns) ──
      "CallExpression[callee.property.name='addEventListener']"(node) {
        const eventArg = node.arguments[0];
        const handlerArg = node.arguments[1];
        if (!eventArg || !handlerArg) return;
        if (containsCentralizedRef(handlerArg, centralizedNames)) return;
        const event = eventArg.type === "Literal" ? String(eventArg.value) : "dynamic";
        const hash = `${event}:${hashNode(handlerArg, 0)}`;
        eventHandlers.push({ hash, event, node, loc: node.loc.start });
      },

      // ── Validation duplication (typeof/instanceof checks) ──
      "BinaryExpression[operator='==='], BinaryExpression[operator='!==']"(node) {
        if (node.left.type === "UnaryExpression" && node.left.operator === "typeof") {
          if (containsCentralizedRef(node.left.argument, centralizedNames)) return;
          const hash = hashNode(node, 0);
          validationPatterns.push({ hash, node, loc: node.loc.start });
        }
      },

      // ── Temporal duplication (setTimeout/setInterval) ──
      "CallExpression[callee.name='setTimeout'], CallExpression[callee.name='setInterval']"(node) {
        if (node.arguments[1]) {
          const hash = `${node.callee.name}:${hashNode(node.arguments[0], 0)}`;
          timeouts.push({ hash, node, loc: node.loc.start });
        }
      },

      // ═══════════════════════════════════════
      // Analysis — run after full file traversal
      // ═══════════════════════════════════════

      "Program:exit"() {
        for (const [key, locs] of literals) {
          if (locs.length >= THRESHOLDS.literal) {
            context.report({ node: locs[0].node, messageId: "duplication", data: { report: buildReport("literal", locs[0].node, {
              what: `Value ${key} repeated ${locs.length} times`,
              locations: locs.map(l => `L${l.loc.line}`).join(", "),
              fix: `Extract to a named constant: const MY_VALUE = ${key}`,
              count: locs.length,
            }) } });
          }
        }

        const funcGroups = groupBy(funcBodies, "hash");
        for (const [, group] of funcGroups) {
          if (group.length >= THRESHOLDS.structural) {
            context.report({ node: group[0].node, messageId: "duplication", data: { report: buildReport("structural", group[0].node, {
              what: `${group.length} functions with identical body structure: ${group.map(g => g.name).join(", ")}`,
              locations: group.map(g => `L${g.loc.line}:${g.name}`).join(", "),
              fix: "Extract shared logic into a single parameterized function",
              count: group.length,
            }) } });
          }
        }

        const condGroups = groupBy(conditions, "hash");
        for (const [, group] of condGroups) {
          if (group.length >= THRESHOLDS.logical) {
            context.report({ node: group[0].node, messageId: "duplication", data: { report: buildReport("logical", group[0].node, {
              what: `Same condition repeated ${group.length} times: "${group[0].source.slice(0, 60)}"`,
              locations: group.map(g => `L${g.loc.line}`).join(", "),
              fix: "Extract to a named predicate: const isX = () => ...",
              count: group.length,
            }) } });
          }
        }

        const shapeGroups = groupBy(objectShapes, "hash");
        for (const [, group] of shapeGroups) {
          if (group.length >= THRESHOLDS.data) {
            context.report({ node: group[0].node, messageId: "duplication", data: { report: buildReport("data", group[0].node, {
              what: `Object shape {${group[0].keys.join(", ")}} repeated ${group.length} times`,
              locations: group.map(g => `L${g.loc.line}`).join(", "),
              fix: "Define a shared type/interface and factory function",
              count: group.length,
            }) } });
          }
        }

        const eventGroups = groupBy(eventHandlers, "hash");
        for (const [, group] of eventGroups) {
          if (group.length >= THRESHOLDS.behavioral) {
            context.report({ node: group[0].node, messageId: "duplication", data: { report: buildReport("behavioral", group[0].node, {
              what: `Same "${group[0].event}" handler pattern repeated ${group.length} times`,
              locations: group.map(g => `L${g.loc.line}`).join(", "),
              fix: "Create a shared handler function and reference it",
              count: group.length,
            }) } });
          }
        }

        const valGroups = groupBy(validationPatterns, "hash");
        for (const [, group] of valGroups) {
          if (group.length >= THRESHOLDS.validation) {
            context.report({ node: group[0].node, messageId: "duplication", data: { report: buildReport("validation", group[0].node, {
              what: `Same type check repeated ${group.length} times`,
              locations: group.map(g => `L${g.loc.line}`).join(", "),
              fix: "Create a type guard function: function isType(x): x is T",
              count: group.length,
            }) } });
          }
        }

        const timeGroups = groupBy(timeouts, "hash");
        for (const [, group] of timeGroups) {
          if (group.length >= THRESHOLDS.temporal) {
            context.report({ node: group[0].node, messageId: "duplication", data: { report: buildReport("temporal", group[0].node, {
              what: `Same timer pattern repeated ${group.length} times`,
              locations: group.map(g => `L${g.loc.line}`).join(", "),
              fix: "Extract to a parameterized delay/scheduler function",
              count: group.length,
            }) } });
          }
        }
      },
    };
  },
};

function groupBy(arr, key) {
  const map = new Map();
  for (const item of arr) {
    const k = item[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}
