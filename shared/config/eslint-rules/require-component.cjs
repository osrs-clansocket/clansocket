/**
 * LVI/require-component — Anonymous tag specifications are banned outside the factory.
 *
 * In feature code, UI must be authored through NAMED factory functions (div, span,
 * button, paragraph, heading, panel, card, ...). Calling build({ tag: "div", ... })
 * or any primitive-with-arbitrary-tag in feature code is a "stray UI definition" —
 * the tag literal lives at the call site instead of being centralized in the factory.
 *
 * Why: a named factory function is a component handle. It can be grep'd, refactored,
 * extended with invariants (a11y, focus, instrumentation) in one place. An anonymous
 * build({ tag: "..." }) is opaque — you cant find every "panel" because each one is
 * just a div with a class. The factory is the registry of every UI primitive in the
 * system; if a new tag is needed, ADD a primitive there.
 *
 * Caught patterns (outside src/dom/factory/**):
 *   build({ tag: "div", ... })             — explicit tag literal in a build() call
 *   primitive("section")(...)              — primitive() factory wrap with tag literal
 *
 * Allowed everywhere:
 *   div({...}), span({...}), button({...})  — named factory functions
 *   card({...}), panel({...}), kpiTile({...}) — higher-level factory abstractions
 *
 * Exempt files:
 *   src/dom/factory/**                       (the factory IS where tag literals live)
 *
 * Escape hatch: precede the violating line with
 *   // eslint-disable-next-line lvi/require-component
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const FACTORY_BUILDERS = new Set(["build", "primitive", "createInstance"]);
const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function extractTagLiteral(call) {
    if (!call.arguments || call.arguments.length === 0) return null;
    const first = call.arguments[0];
    if (!first) return null;

    if (first.type === "Literal" && typeof first.value === "string") return first.value;

    if (first.type === "ObjectExpression") {
        for (const prop of first.properties) {
            if (prop.type !== "Property") continue;
            const key = prop.key && (prop.key.name || prop.key.value);
            if (key !== "tag") continue;
            if (prop.value.type === "Literal" && typeof prop.value.value === "string") {
                return prop.value.value;
            }
        }
    }
    return null;
}

function calleeName(call) {
    const c = call.callee;
    if (!c) return null;
    if (c.type === "Identifier") return c.name;
    if (c.type === "MemberExpression" && c.property && c.property.name) return c.property.name;
    return null;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Force NAMED factory function calls; ban anonymous tag literals in feature code." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);

        return {
            CallExpression(node) {
                const name = calleeName(node);
                if (!name || !FACTORY_BUILDERS.has(name)) return;
                const tag = extractTagLiteral(node);
                if (tag === null) return;

                const t = trace(node, raw, mod);
                context.report({
                    node,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "require-component",
                            narrative: `Feature code used ${name}({ tag: "${tag}" }) — an anonymous tag specification. UI must be authored through NAMED factory functions; tag literals live ONLY in src/dom/factory/**, not at call sites.`,
                            graph: {
                                X: `${t.file}:${t.line} — ${name}() with tag literal "${tag}" in ${t.context}`,
                                Y: `the resulting element has no component identity — cant be grep'd, refactored, or extended as a named handle`,
                                Z: `no_separation — UI primitives are defined in two places (factory + ad-hoc tag literals)`,
                                W: `each anonymous tag drifts independently; structural patterns repeat without ever being promoted to named factories; the registry never grows`,
                            },
                            remediation: `Use the matching named factory function (div, span, paragraph, heading, button, panel, card, section, ...). If no factory exists for "${tag}", ADD one to src/dom/factory/{content|layout|data}/ — even single-use earns a named function. The factory is the registry of every UI primitive; growing it is the design intent.`,
                            trace: t,
                        }),
                    },
                });
            },
        };
    },
};
