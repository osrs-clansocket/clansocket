/**
 * LVI/no-env-fallback — Bans process.env fallbacks via ?? or || operators.
 *
 * env vars must error if missing, not silently default. silent fallbacks let
 * configs drift in prod (SERVER_PORT defaults to 3000 because SERVER_PORT wasn't
 * set; tokens default to empty because API_TOKEN wasn't set; etc.). loud failure
 * at boot beats silent misbehavior in prod.
 *
 * banned: `process.env.X ?? "default"`, `process.env.X || "default"`
 *         (both member and bracket access forms of process.env.X)
 *
 * replacement: `if (!process.env.X) throw new Error("X env var required");`
 *              then use `process.env.X` directly.
 */

const FALLBACK_OPERATORS = new Set(["??", "||"]);

function isProcessEnvAccess(node) {
    if (!node || node.type !== "MemberExpression") return false;
    const obj = node.object;
    if (!obj || obj.type !== "MemberExpression") return false;
    const root = obj.object;
    const envProp = obj.property;
    if (!root || root.type !== "Identifier" || root.name !== "process") return false;
    if (!envProp || envProp.type !== "Identifier" || envProp.name !== "env") return false;
    return true;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description: "Ban process.env fallbacks. Env vars must throw on missing.",
        },
        schema: [],
        messages: {
            envFallback: "process.env fallback banned. env vars must error if missing. replace with: if (!process.env.X) throw new Error('X env var required'); then use process.env.X directly.",
        },
    },
    create(context) {
        return {
            LogicalExpression(node) {
                if (!FALLBACK_OPERATORS.has(node.operator)) return;
                if (!isProcessEnvAccess(node.left)) return;
                context.report({
                    node,
                    messageId: "envFallback",
                });
            },
        };
    },
};
