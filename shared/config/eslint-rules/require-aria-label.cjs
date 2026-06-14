/**
 * LVI/require-aria-label — Interactive factory calls must surface an accessible name.
 *
 * Flags:
 *   button(...) / anchor(...)  with no text prop AND no ariaLabel/ariaLabelledby
 *                              shorthand AND no string child  →  icon-only / blank button
 *   input(...) / textarea(...) with no ariaLabel/ariaLabelledby shorthand AND not
 *                              wrapped in label(...) call  →  unlabelled field
 *
 * One path: the canonical accessible-name surface is the top-level `ariaLabel` /
 * `ariaLabelledby` factory prop. The `attrs: { "aria-label": ... }` long form is the
 * unneeded redefinition and is NOT considered a satisfier here.
 *
 * The auto-key derivation in the factory uses the same hint order (aria-label → name
 * → placeholder → text). When none of those exist, the AI's collector synthesizes a
 * non-semantic key and screen readers announce "button" with no label. Both signal
 * the same missing affordance.
 *
 * Escape hatch: precede the call with
 *   // eslint-disable-next-line lvi/require-aria-label
 * Use ONLY when the element is intentionally decorative (and aria-hidden="true" on
 * a parent makes it announce as nothing).
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const INTERACTIVE_NEEDS_TEXT = new Set(["button", "anchor"]);
const FIELD_FACTORIES = new Set(["input", "textarea"]);

function calleeName(call) {
    const c = call.callee;
    if (!c) return null;
    if (c.type === "Identifier") return c.name;
    if (c.type === "MemberExpression" && c.property && c.property.name) return c.property.name;
    return null;
}

function firstArgObject(call) {
    if (!call.arguments || call.arguments.length === 0) return null;
    const first = call.arguments[0];
    if (!first || first.type !== "ObjectExpression") return null;
    return first;
}

function propByName(obj, name) {
    for (const prop of obj.properties) {
        if (prop.type !== "Property") continue;
        const k = prop.key && (prop.key.name || prop.key.value);
        if (k === name) return prop;
    }
    return null;
}

function hasMeaningfulProp(propsObj, name) {
    const p = propByName(propsObj, name);
    if (!p || !p.value) return false;
    if (p.value.type === "Literal") return typeof p.value.value === "string" && p.value.value.length > 0;
    return true;
}

function attrsHas(propsObj, attrName) {
    const attrs = propByName(propsObj, "attrs");
    if (!attrs || !attrs.value || attrs.value.type !== "ObjectExpression") return false;
    return propByName(attrs.value, attrName) !== null;
}

function hasAccessibleAttr(propsObj) {
    return hasMeaningfulProp(propsObj, "ariaLabel") || hasMeaningfulProp(propsObj, "ariaLabelledby");
}

function childHasText(child) {
    if (!child) return false;
    if (child.type === "Literal" && typeof child.value === "string" && child.value.trim().length > 0) return true;
    let target = child;
    if (target.type === "MemberExpression" && target.property && target.property.name === "el") {
        target = target.object;
    }
    if (target.type === "CallExpression") {
        const propsObj = firstArgObject(target);
        if (propsObj && hasMeaningfulProp(propsObj, "text")) return true;
        if (childHasTextInChildren(target)) return true;
    }
    return false;
}

function childHasTextInChildren(call) {
    if (!call.arguments || call.arguments.length < 2) return false;
    const childrenArg = call.arguments[1];
    if (!childrenArg || childrenArg.type !== "ArrayExpression") return false;
    for (const el of childrenArg.elements) {
        if (childHasText(el)) return true;
    }
    return false;
}

function hasStringOrTextChild(call) {
    return childHasTextInChildren(call);
}

function isHiddenInput(propsObj) {
    const attrs = propByName(propsObj, "attrs");
    if (!attrs || !attrs.value || attrs.value.type !== "ObjectExpression") return false;
    const typeProp = propByName(attrs.value, "type");
    if (!typeProp || !typeProp.value || typeProp.value.type !== "Literal") return false;
    return typeProp.value.value === "hidden";
}

function wrappedInLabelCall(node) {
    let cur = node.parent;
    while (cur) {
        if (cur.type === "CallExpression" && calleeName(cur) === "label") return true;
        cur = cur.parent;
    }
    return false;
}

function buildReport(rule, factoryName, narrative, t) {
    return build4DReport({
        rule,
        narrative,
        graph: {
            X: `${t.file}:${t.line} — ${factoryName}() call has no accessible name in ${t.context}`,
            Y: `screen readers announce "button" / "edit" with no label; AI collector synthesizes a non-semantic loose-${factoryName}-* key`,
            Z: `no_implicit (MakeAffordanceExplicit) — interactive elements without accessible names are unusable by assistive tech and unreferenceable by the AI`,
            W: `every unlabelled interactive element is invisible to screen-reader users and rendered as an opaque "loose-${factoryName}-N" handle in the AI's page snapshot`,
        },
        remediation: `Pass a semantic affordance: ${factoryName === "button" || factoryName === "anchor" ? `text: "Label" in props, OR ariaLabel: "Label" for icon-only` : `ariaLabel: "Description" OR wrap in label({...}, [${factoryName}({...})])`}. The factory's auto-key picks up aria-label/name/placeholder/text in that order — the same hint becomes the AI's data-key for navigate/highlight actions.`,
        trace: t,
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Interactive factory calls require an accessible name (aria-label, text, or wrapping label)." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        const mod = getModuleForFile(raw);

        return {
            CallExpression(node) {
                const name = calleeName(node);
                if (!name) return;

                if (INTERACTIVE_NEEDS_TEXT.has(name)) {
                    const propsObj = firstArgObject(node);
                    if (!propsObj) return;
                    if (hasMeaningfulProp(propsObj, "text")) return;
                    if (hasAccessibleAttr(propsObj)) return;
                    if (hasStringOrTextChild(node)) return;
                    const t = trace(node, raw, mod);
                    const narrative = `${name}() factory call has no accessible name. Without text, aria-label, or aria-labelledby, screen readers announce it as an unlabelled control and the AI's page snapshot loses any addressable handle.`;
                    context.report({
                        node,
                        messageId: "report",
                        data: { report: buildReport("require-aria-label", name, narrative, t) },
                    });
                    return;
                }

                if (FIELD_FACTORIES.has(name)) {
                    const propsObj = firstArgObject(node);
                    if (!propsObj) return;
                    if (hasAccessibleAttr(propsObj)) return;
                    if (wrappedInLabelCall(node)) return;
                    if (isHiddenInput(propsObj)) return;
                    const t = trace(node, raw, mod);
                    const narrative = `${name}() factory call has no accessible name. Form fields must either set aria-label / aria-labelledby OR be wrapped in a label({...}, [${name}({...})]) parent so screen readers can announce them.`;
                    context.report({
                        node,
                        messageId: "report",
                        data: { report: buildReport("require-aria-label", name, narrative, t) },
                    });
                }
            },
        };
    },
};
