/**
 * LVI/no-raw-dom — Browser DOM mutation APIs are banned outside the factory layer.
 *
 * The factory (src/dom/factory/**) is the chokepoint for every DOM creation,
 * structural mutation, and attribute write. Feature code (src/dom/<feature>/**,
 * src/managers/**, src/state/**) must compose UI from factory functions — never
 * touch the browser DOM directly.
 *
 * Why: a single chokepoint means a single place to wire correctness invariants
 * (a11y attributes, focus management, keyboard nav, instrumentation, deep-link
 * tracking). Direct DOM mutation in feature code is a stray UI definition — it
 * bypasses everything the factory enforces.
 *
 * Caught APIs:
 *   creation:    document.createElement, document.createElementNS, createTextNode,
 *                document.createDocumentFragment
 *   structure:   appendChild, removeChild, replaceChild, insertBefore,
 *                replaceChildren, remove, append, prepend,
 *                insertAdjacentHTML, insertAdjacentElement
 *   innerHTML:   element.innerHTML = ..., outerHTML = ..., textContent = ...
 *   attributes:  setAttribute, removeAttribute, setAttributeNS, removeAttributeNS
 *
 * Exempt files (raw DOM is the chokepoint's own implementation):
 *   src/dom/factory/**       (the factory IS the chokepoint)
 *
 * Everywhere else in the dashboard — including dom/background, dom/ai, managers,
 * state, app — must route through the factory. If the factory lacks something
 * a feature needs (canvas ops, animations, style mutation, event wiring),
 * EXTEND the factory rather than bypass it.
 *
 * Escape hatch: precede the violating line with
 *   // eslint-disable-next-line lvi/no-raw-dom
 * The no-comments cleaner preserves eslint directives.
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
const CREATION_METHODS = new Set([
    "createElement",
    "createElementNS",
    "createTextNode",
    "createDocumentFragment",
]);
const ATTRIBUTE_METHODS = new Set(["setAttribute", "removeAttribute", "setAttributeNS", "removeAttributeNS"]);
const STRUCTURAL_PROPS = new Set(["innerHTML", "outerHTML", "textContent"]);

const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function methodKindFor(name) {
    if (CREATION_METHODS.has(name)) return "creation";
    if (STRUCTURAL_METHODS.has(name)) return "structure";
    if (ATTRIBUTE_METHODS.has(name)) return "attribute";
    return null;
}

function isClassListReceiver(call) {
    const obj = call.callee && call.callee.object;
    if (!obj || obj.type !== "MemberExpression") return false;
    const prop = obj.property && obj.property.name;
    return prop === "classList";
}

function explainKind(kind, name) {
    if (kind === "creation") {
        return `direct browser DOM creation (${name}) — the factory owns element creation`;
    }
    if (kind === "structure") {
        return `direct structural mutation (${name}) — the factory owns tree composition`;
    }
    if (kind === "attribute") {
        return `direct attribute write (${name}) — the factory owns attribute composition via the attrs option`;
    }
    return `direct innerHTML/textContent assignment — the factory owns text + child injection`;
}

function remediationFor(kind) {
    if (kind === "creation") {
        return `Import the matching primitive from "@/dom/factory" (div, span, paragraph, button, heading, canvas, ...) and call it instead. If the tag has no primitive yet, ADD one to src/dom/factory/{content|layout|data}/ — never inline createElement in feature code.`;
    }
    if (kind === "structure") {
        return `Compose the tree by passing children to the factory call (e.g. div({...}, [child.el, ...])). For dynamic updates, use replaceChildren via the factory's update API or rebuild + swap. Mutating .el directly from feature code defeats the factory's a11y + lifecycle wiring.`;
    }
    if (kind === "attribute") {
        return `Pass the attribute via the factory's { attrs: { ... } } option, or extend the relevant primitive in src/dom/factory/ to surface it as a typed prop. Direct setAttribute leaks state outside the factory's awareness.`;
    }
    return `Use the factory's { text } / { html } option (when safe), or the children array. innerHTML in feature code bypasses every chokepoint invariant — and is an XSS surface besides.`;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban browser DOM mutation APIs outside the factory layer." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);

        function report(node, kind, label) {
            const t = trace(node, raw, mod);
            context.report({
                node,
                messageId: "report",
                data: {
                    report: build4DReport({
                        rule: "no-raw-dom",
                        narrative: `Feature code bypassed the factory layer with ${explainKind(kind, label)}. The factory is the single chokepoint for DOM authoring; every bypass is a stray UI definition that escapes shared invariants.`,
                        graph: {
                            X: `${t.file}:${t.line} — ${label} called in ${t.context}`,
                            Y: `the factory (src/dom/factory/**) is bypassed — a11y, focus, lifecycle, and instrumentation wiring all miss this element`,
                            Z: `no_separation — UI authoring lives in two places (factory + ad-hoc feature code)`,
                            W: `every bypass drifts independently; future invariants added to the factory dont reach these stray elements; refactors must hunt them down by hand`,
                        },
                        remediation: remediationFor(kind),
                        trace: t,
                    }),
                },
            });
        }

        return {
            CallExpression(node) {
                const callee = node.callee;
                if (!callee || callee.type !== "MemberExpression") return;
                const name = callee.property && callee.property.name;
                if (!name) return;
                const kind = methodKindFor(name);
                if (!kind) return;
                if (isClassListReceiver(node)) return;
                report(node, kind, name);
            },
            AssignmentExpression(node) {
                if (node.left.type !== "MemberExpression") return;
                const prop = node.left.property && node.left.property.name;
                if (!STRUCTURAL_PROPS.has(prop)) return;
                report(node, "innerHTML", prop);
            },
        };
    },
};
