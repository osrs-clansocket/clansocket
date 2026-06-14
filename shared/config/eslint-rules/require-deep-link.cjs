/**
 * LVI/require-deep-link — interactive handlers that mutate UI state should be URL-addressable.
 *
 * Flags click/keydown handlers that:
 *   - mutate structural DOM (innerHTML, outerHTML, appendChild, remove, replaceChildren, ...)
 *   - OR toggle "state-ful" modifier classes (--active, --open, --selected, --expanded, --shown)
 * AND do not call any of:
 *   - deepLink.navigate(...)
 *   - history.pushState(...) / history.replaceState(...)
 *
 * Escape hatch: precede the addEventListener call with a standard ESLint disable directive:
 *   // eslint-disable-next-line lvi/require-deep-link
 * The LVI/no-comments cleaner preserves eslint directives, so this opt-out survives auto-fix.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const STRUCTURAL_METHODS = new Set([
  "appendChild",
  "removeChild",
  "replaceChild",
  "insertBefore",
  "replaceChildren",
  "remove",
  "append",
  "prepend",
  "insertAdjacentHTML",
  "insertAdjacentElement",
]);
const STRUCTURAL_PROPS = new Set(["innerHTML", "outerHTML", "textContent"]);
const STATEFUL_SUFFIXES = ["--active", "--open", "--selected", "--expanded", "--shown", "--visible"];
const DEEP_LINK_MARKERS = new Set(["navigate", "pushState", "replaceState"]);
const TARGET_EVENTS = new Set(["click", "keydown", "keyup", "submit"]);

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (node.type) visit(node);
  for (const key in node) {
    if (key === "parent") continue;
    const val = node[key];
    if (val && typeof val === "object") walk(val, visit);
  }
}

function isStatefulClassArg(args) {
  for (const a of args) {
    if (a && a.type === "Literal" && typeof a.value === "string") {
      for (const sfx of STATEFUL_SUFFIXES) if (a.value.endsWith(sfx)) return true;
    }
  }
  return false;
}

function isClassListMutation(call) {
  const callee = call.callee;
  if (!callee || callee.type !== "MemberExpression") return false;
  const method = callee.property && callee.property.name;
  if (method !== "add" && method !== "remove" && method !== "toggle") return false;
  const obj = callee.object;
  if (!obj || obj.type !== "MemberExpression") return false;
  if (!obj.property || obj.property.name !== "classList") return false;
  return isStatefulClassArg(call.arguments);
}

function isStructuralCall(call) {
  const callee = call.callee;
  if (!callee || callee.type !== "MemberExpression") return false;
  const method = callee.property && callee.property.name;
  return STRUCTURAL_METHODS.has(method);
}

function isStructuralAssignment(node) {
  if (node.type !== "AssignmentExpression") return false;
  if (node.left.type !== "MemberExpression") return false;
  const prop = node.left.property && node.left.property.name;
  return STRUCTURAL_PROPS.has(prop);
}

function bodyHasMutation(fnBody) {
  let found = false;
  walk(fnBody, (n) => {
    if (found) return;
    if (n.type === "CallExpression" && (isStructuralCall(n) || isClassListMutation(n))) found = true;
    else if (isStructuralAssignment(n)) found = true;
  });
  return found;
}

function bodyHasDeepLink(fnBody) {
  let found = false;
  walk(fnBody, (n) => {
    if (found) return;
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression") {
      const prop = n.callee.property && n.callee.property.name;
      if (DEEP_LINK_MARKERS.has(prop)) found = true;
    }
  });
  return found;
}

function isFnNode(n) {
  return n && (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression");
}

function extractHandler(call) {
  if (call.callee.type !== "MemberExpression") return null;
  if (call.callee.property.name !== "addEventListener") return null;
  const args = call.arguments;
  if (args.length < 2) return null;
  if (args[0].type !== "Literal" || typeof args[0].value !== "string") return null;
  if (!TARGET_EVENTS.has(args[0].value)) return null;
  return isFnNode(args[1]) ? args[1] : null;
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: { description: "Interactive handlers that mutate UI should also update the URL." },
    schema: [],
    messages: { report: "{{ report }}" },
  },
  create(context) {
    const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
    const mod = getModuleForFile(raw);
    return {
      CallExpression(node) {
        const fn = extractHandler(node);
        if (!fn) return;
        if (!bodyHasMutation(fn.body)) return;
        if (bodyHasDeepLink(fn.body)) return;
        const t = trace(node, raw, mod);
        context.report({
          node,
          messageId: "report",
          data: {
            report: build4DReport({
              rule: "require-deep-link",
              narrative: `Interactive handler mutates UI state without updating the URL. Every meaningful action should be URL-addressable so the resulting view is shareable, bookmarkable, and restorable by the back button.`,
              graph: {
                X: `${t.file}:${t.line} — ${node.arguments[0].value} handler mutates DOM in ${t.context}`,
                Y: `the resulting UI state is not encoded in the URL — sharing, reloading, or back-button all lose it`,
                Z: `no_separation — user-visible state lives only in DOM, decoupled from the address bar`,
                W: `shared URLs reproduce the wrong view; back/forward gives the wrong scene; refresh wipes the change`,
              },
              remediation: `Drive the change through deepLink.navigate("/pattern") and register a handler via deepLink.register, or call history.replaceState(undefined, "", path) if the change is cosmetic-but-restorable. For legitimately ephemeral handlers (hover, transient popover, focus glow), add "// eslint-disable-next-line lvi/require-deep-link" directly above the addEventListener(...) call — the no-comments cleaner preserves eslint directives.`,
              trace: t,
            }),
          },
        });
      },
    };
  },
};
