/**
 * LVI/persisted-signal-key-shape — persistedSignal keys must match
 *   ^[a-z][a-z0-9-]*\.[a-zA-Z0-9.-]+$
 *
 * Examples passing:   clan-map.viewport, clan-map.followedHash, ai.chain-mode
 * Examples failing:   ClanMap.viewport (uppercase scope), foo (no scope), .foo (empty scope)
 *
 * Why: a consistent scope.key namespace lets you grep/audit "what persists for
 * X" by prefix, makes migration scripts trivial, and prevents accidental key
 * collisions across surfaces. The kebab-case scope matches the codebase's
 * folder/file conventions.
 *
 * persistedScope("prefix") is also checked — prefix must match scope segment
 * shape (lowercase, kebab).
 */

const KEY_RE = /^[a-z][a-z0-9-]*\.[a-zA-Z0-9.-]+$/;
const SCOPE_RE = /^[a-z][a-z0-9-]*$/;
const FN_TARGETS = new Set(["persistedSignal"]);
const SCOPE_FN = "persistedScope";
const METHOD_TARGETS = new Set(["boolean", "string", "number", "json"]);

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "persistedSignal keys must match scope.key kebab-case format." },
        schema: [],
        messages: {
            shape: 'Key "{{key}}" does not match scope.key format (lowercase scope + dot + name, e.g. "clan-map.viewport"). A consistent namespace makes persisted state grep-able and migration-safe.',
            scopeShape: 'Scope "{{scope}}" must be lowercase kebab (e.g. "clan-map"). Mixed case or other separators break the convention used everywhere else.',
        },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (raw.endsWith("/state/persistence/persisted-signal.ts")) return {};
        return {
            CallExpression(node) {
                const callee = node.callee;
                const arg = node.arguments[0];
                if (!arg || arg.type !== "Literal" || typeof arg.value !== "string") return;
                if (callee.type === "Identifier" && FN_TARGETS.has(callee.name)) {
                    if (!KEY_RE.test(arg.value)) {
                        context.report({ node: arg, messageId: "shape", data: { key: arg.value } });
                    }
                    return;
                }
                if (callee.type === "Identifier" && callee.name === SCOPE_FN) {
                    if (!SCOPE_RE.test(arg.value)) {
                        context.report({ node: arg, messageId: "scopeShape", data: { scope: arg.value } });
                    }
                }
            },
        };
    },
};
