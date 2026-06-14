/**
 * LVI/prefer-lookup-table — Flag long switch statements and same-discriminant if-chains
 * (5+ branches) whose every branch is a single `return <expr>`. Those compress losslessly
 * into a `Record<K, V>` (or `Map<K, V>`) lookup — the table is the data, the dispatch
 * becomes a single read. Discriminated-union switches with multi-statement bodies, side
 * effects, or differing return types are left alone — TS narrowing wants the switch there.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const MIN_BRANCHES = 5;

function pathOf(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "ThisExpression") return "this";
  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    const base = pathOf(node.object);
    if (!base) return null;
    return `${base}.${node.property.name}`;
  }
  return null;
}

function isLiteralKey(node) {
  if (!node) return false;
  if (node.type === "Literal") {
    const v = node.value;
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return true;
  return false;
}

function statementsOf(consequent) {
  if (!consequent) return [];
  if (Array.isArray(consequent)) return consequent;
  if (consequent.type === "BlockStatement") return consequent.body;
  return [consequent];
}

function isSingleReturn(stmts) {
  if (stmts.length !== 1) return false;
  return stmts[0].type === "ReturnStatement" && stmts[0].argument != null;
}

function switchAllSingleReturn(switchNode) {
  if (switchNode.cases.length === 0) return false;
  const last = switchNode.cases[switchNode.cases.length - 1];
  if (last.consequent.length === 0) return false;
  for (const c of switchNode.cases) {
    if (c.consequent.length === 0) continue;
    if (!isSingleReturn(c.consequent)) return false;
  }
  return true;
}

function caseKeys(switchNode) {
  const keys = [];
  for (const c of switchNode.cases) {
    if (c.test === null) {
      keys.push({ kind: "default" });
      continue;
    }
    if (!isLiteralKey(c.test) && c.test.type !== "Identifier" && c.test.type !== "MemberExpression") {
      return null;
    }
    keys.push({ kind: "case", node: c.test });
  }
  return keys;
}

function eqSides(test) {
  if (test.type !== "BinaryExpression" || test.operator !== "===") return null;
  if (isLiteralKey(test.right)) return { discriminant: test.left, literal: test.right };
  if (isLiteralKey(test.left)) return { discriminant: test.right, literal: test.left };
  return null;
}

function ifChainStart(node) {
  return !(node.parent && node.parent.type === "IfStatement" && node.parent.alternate === node);
}

function collectChain(node) {
  const branches = [];
  let cur = node;
  while (cur && cur.type === "IfStatement") {
    branches.push({ test: cur.test, consequent: cur.consequent });
    cur = cur.alternate;
  }
  if (cur) branches.push({ test: null, consequent: cur });
  return branches;
}

function chainShape(branches) {
  let discriminant = null;
  for (const b of branches) {
    if (!isSingleReturn(statementsOf(b.consequent))) return null;
    if (b.test === null) continue;
    const sides = eqSides(b.test);
    if (!sides) return null;
    const path = pathOf(sides.discriminant);
    if (!path) return null;
    if (discriminant === null) discriminant = path;
    else if (discriminant !== path) return null;
  }
  return discriminant;
}

function reportSwitch(context, node, raw, mod) {
  const t = trace(node, raw, mod);
  const branches = node.cases.length;
  context.report({
    node,
    messageId: "report",
    data: {
      report: build4DReport({
        rule: "prefer-lookup-table",
        narrative: `switch with ${branches} branches where every case is a single \`return <expr>\`. That shape compresses losslessly into a \`Record<K, V>\` (or \`Map<K, V>\`) — the table holds the data, dispatch becomes one read, and adding a new key is a one-line edit instead of growing the switch body.`,
        graph: {
          X: `${t.file}:${t.line} — switch statement in ${t.context} with ${branches} return-only cases`,
          Y: `every reader has to scan the full switch to know which key maps to which value; every editor has to touch the same hot function to add or rename a key; every refactor risks dropping a \`break\` or duplicating a case`,
          Z: `extract the cases into a const \`Record<K, V>\` declared at module scope (or a \`Map<K, V>\` if keys arent statically known), then replace the switch with \`return TABLE[discriminant] ?? <default>\` — single read, single source of data, type-checker enforces exhaustiveness when K is a literal union`,
          W: `5+ return-only branches is the LVI threshold (matches the css 5+ token rule). below that, a switch is fine. above it, the cost of scanning + maintaining the dispatch outweighs the readability of inline cases`,
        },
        remediation: `lift the case keys + return expressions into a \`const TABLE: Record<K, V> = { ... }\` above the function, then replace the switch with one lookup. if a default branch exists, use \`TABLE[k] ?? defaultValue\`. if a case genuinely needs TS exhaustiveness narrowing across discriminated-union members (each case has different statement shapes, not just different return values), add \`// eslint-disable-next-line lvi/prefer-lookup-table\` immediately above the \`switch\` with one line explaining why the switch shape is load-bearing.`,
        trace: t,
      }),
    },
  });
}

function reportChain(context, node, raw, mod, branches, discriminant) {
  const t = trace(node, raw, mod);
  context.report({
    node,
    messageId: "report",
    data: {
      report: build4DReport({
        rule: "prefer-lookup-table",
        narrative: `if/else-if chain with ${branches} branches, all testing \`${discriminant} === <literal>\` and every branch a single \`return <expr>\`. That shape compresses losslessly into a \`Record<K, V>\` — the chain is data pretending to be code.`,
        graph: {
          X: `${t.file}:${t.line} — if-chain in ${t.context} testing \`${discriminant}\` against ${branches} literal keys`,
          Y: `the chain hides what is actually a key→value mapping behind branch syntax; the reader cant scan the dispatch as a table; the editor must thread a new branch into the chain in the right place instead of adding one row`,
          Z: `extract the (key, value) pairs into a const \`Record<K, V>\` at module scope, then replace the chain with \`return TABLE[${discriminant}] ?? <else-branch-value>\` — the trailing \`else\` (if any) becomes the \`??\` fallback`,
          W: `5+ same-discriminant === branches is the LVI threshold. heterogeneous chains (different predicates per branch) are not flagged — those genuinely need branch syntax`,
        },
        remediation: `convert the chain to a const \`Record<${discriminant}-type, ReturnType> = { ... }\` and a single \`return TABLE[${discriminant}] ?? <fallback>\`. if the chain is in fact heterogeneous (this rule misclassified it) or the branches share state across the chain in a non-trivial way, add \`// eslint-disable-next-line lvi/prefer-lookup-table\` above the leading \`if\` with one line explaining why.`,
        trace: t,
      }),
    },
  });
}

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Force lookup-table for switch/if-chains with 5+ return-only branches" },
    schema: [],
    messages: { report: "{{ report }}" },
  },
  create(context) {
    const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
    const mod = getModuleForFile(raw);
    return {
      SwitchStatement(node) {
        if (node.cases.length < MIN_BRANCHES) return;
        if (!switchAllSingleReturn(node)) return;
        if (!caseKeys(node)) return;
        reportSwitch(context, node, raw, mod);
      },
      IfStatement(node) {
        if (!ifChainStart(node)) return;
        const branches = collectChain(node);
        if (branches.length < MIN_BRANCHES) return;
        const discriminant = chainShape(branches);
        if (!discriminant) return;
        reportChain(context, node, raw, mod, branches.length, discriminant);
      },
    };
  },
};
