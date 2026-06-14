/**
 * LVI/no-empty — Bans empty block statements + empty switch.
 * Functions with empty bodies pass (intentional no-op functions exist).
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const FUNCTION_BODY_PARENTS = new Set([
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
    "MethodDefinition",
]);

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Empty blocks and switch statements are banned" },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw) || "unknown";
        const sourceCode = context.sourceCode;
        function reportEmpty(node, kind) {
            const t = trace(node, raw, mod);
            context.report({ node, messageId: "report", data: { report: build4DReport({
                rule: "no-empty",
                narrative: `Empty ${kind} at ${t.file}:${t.line}. Violates intent-completeness — empty blocks signal dead branches or unfinished implementations.`,
                graph: {
                    X: `empty ${kind} in ${t.context}`,
                    Y: `readers cannot distinguish "intentional no-op" from "forgotten code"`,
                    Z: `intent_completeness — every branch must declare its outcome explicitly`,
                    W: `unread empty blocks accumulate and mask real bugs (catch swallowing errors, etc.)`,
                },
                remediation: `Either fill the block with the intended action OR remove the surrounding statement. If truly intentional (catch+swallow), add a single-line comment explaining WHY and a no-op statement like \`void 0;\`.`,
                trace: t,
            }) } });
        }
        return {
            BlockStatement(node) {
                if (node.body.length > 0) return;
                if (node.parent && FUNCTION_BODY_PARENTS.has(node.parent.type)) return;
                const inside = sourceCode.getCommentsInside(node);
                if (inside.length > 0) return;
                reportEmpty(node, "block");
            },
            SwitchStatement(node) {
                if (node.cases.length === 0) reportEmpty(node, "switch");
            },
        };
    },
};
