/**
 * LVI/persisted-signal-key-literal — Keys passed to persistedSignal/persistedScope
 * must be string literals (no template literals, no variables, no concatenation).
 *
 * Why: dynamic keys silently break persistence when the prefix or interpolated
 * value changes (e.g. user switches clan slug → key changes → old saved state
 * becomes orphan, new state hydrates from nothing). String literals are
 * grep-able, lint-checkable, and stable across refactors. If you need per-X
 * state, key it on a fixed scope and store an inner map keyed by X — never
 * vary the localStorage key itself.
 *
 * Caught:
 *   persistedSignal(`${prefix}.foo`, ...)         // template literal
 *   persistedSignal(key, ...)                     // variable
 *   persistedSignal("a" + scope, ...)             // concatenation
 *   persistedScope(slug)                          // dynamic scope prefix
 *   settings.boolean(myKey, false)                // variable
 *
 * Allowed:
 *   persistedSignal("clan-map.viewport", ...)
 *   persistedScope("clan-map")
 *   settings.boolean("gridVisible", false)
 */

const TARGET_FNS = new Set(["persistedSignal", "persistedScope"]);
const TARGET_METHODS = new Set(["boolean", "string", "number", "json"]);

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "persistedSignal/persistedScope keys must be string literals." },
        schema: [],
        messages: {
            literal: "First argument to {{name}} must be a string literal, got {{kind}}. Dynamic keys silently break persistence on key drift — use a fixed key and store inner maps if you need per-X state.",
        },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (raw.endsWith("/state/persistence/persisted-signal.ts")) return {};
        function check(node, name) {
            const arg = node.arguments[0];
            if (!arg) return;
            if (arg.type === "Literal" && typeof arg.value === "string") return;
            const kind =
                arg.type === "TemplateLiteral"
                    ? "template literal"
                    : arg.type === "BinaryExpression"
                      ? "concatenation"
                      : arg.type === "Identifier"
                        ? "variable"
                        : arg.type;
            context.report({ node: arg, messageId: "literal", data: { name, kind } });
        }
        return {
            CallExpression(node) {
                const callee = node.callee;
                if (callee.type === "Identifier" && TARGET_FNS.has(callee.name)) {
                    check(node, callee.name);
                    return;
                }
                if (callee.type === "MemberExpression" && callee.property && TARGET_METHODS.has(callee.property.name)) {
                    check(node, `scope.${callee.property.name}`);
                }
            },
        };
    },
};
