/**
 * LVI/require-context-meta — every factory element must declare context + meta,
 * and the value must match the element's operationability.
 *
 * A self-describing dom is the data source the AI's meta-tag index reads — but only
 * elements the AI can DIRECTLY operate (click/fill/select/submit/toggle/navigate)
 * should carry a context. Static layout/display elements must be null so the AI
 * doesnt treat noise as operable targets just because it can see them.
 *
 * The rule detects operationability from the call:
 *   - inherently-operable factories (button/input/select/textarea/form/anchor/details)
 *       → context MUST be a real string + meta MUST be concern tags. null is rejected.
 *   - generic element WITH an interaction handler (onClick/onSubmit/onInput/onChange/onKey*)
 *       → author's choice: a direct click-target carries context; a delegation container is null.
 *   - static element (no handler, not inherently-operable)
 *       → context MUST be null + meta MUST be null. a non-null value is AI-target noise.
 * every element must declare both props explicitly — absence is always an error.
 *
 * tag validity for meta is enforced by the MetaTag union (tsc); this rule governs
 * presence + the operationability correlation.
 *
 * Exempt: src/dom/factory/** (the factory authors the primitives).
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const COVERED = new Set([
    "build",
    "container",
    "div",
    "header",
    "footer",
    "nav",
    "article",
    "asideEl",
    "mainEl",
    "section",
    "panel",
    "grid",
    "autoGrid",
    "chartGrid",
    "listGrid",
    "scrollContainer",
    "modal",
    "popover",
    "heading",
    "span",
    "paragraph",
    "anchor",
    "code",
    "pre",
    "details",
    "summary",
    "sectionTitle",
    "sectionSubtitle",
    "panelTitle",
    "button",
    "icon",
    "image",
    "canvas",
    "scratchCanvas",
    "divider",
    "vr",
    "spacer",
    "texture",
    "input",
    "label",
    "form",
    "textarea",
    "select",
    "option",
    "card",
    "chartCard",
    "listCard",
    "kpiTile",
    "dataTable",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "rsnTag",
    "clanAvatarInner",
]);
const OPERABLE = new Set(["button", "input", "textarea", "select", "form", "anchor", "details"]);
const HANDLERS = new Set(["onClick", "onSubmit", "onInput", "onChange", "onKeydown", "onKeyup", "onKeypress"]);
const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function calleeName(call) {
    // factory functions are bare-identifier imports (div(...), select(...), button(...)).
    // a member-expression callee (editor.el.select(), x.button()) is always a DOM/object
    // method, never a factory — matching it produces false positives.
    const c = call.callee;
    if (c && c.type === "Identifier") return c.name;
    return null;
}

function propsObject(call) {
    if (!call.arguments) return null;
    for (const arg of call.arguments) {
        if (arg && arg.type === "ObjectExpression") return arg;
    }
    return null;
}

function propValue(obj, key) {
    if (!obj) return undefined;
    for (const prop of obj.properties) {
        if (prop.type !== "Property") continue;
        const k = prop.key && (prop.key.name || prop.key.value);
        if (k === key) return prop.value;
    }
    return undefined;
}

function isNullLiteral(node) {
    return Boolean(node) && node.type === "Literal" && node.value === null;
}

function hasHandler(obj) {
    if (!obj) return false;
    for (const prop of obj.properties) {
        if (prop.type !== "Property") continue;
        const k = prop.key && (prop.key.name || prop.key.value);
        if (HANDLERS.has(k)) return true;
    }
    return false;
}

function diagnose(name, props) {
    const ctx = propValue(props, "context");
    const meta = propValue(props, "meta");
    if (ctx === undefined || meta === undefined) {
        return "must declare both context + meta explicitly (null for static/layout, a value for operable controls)";
    }
    if (OPERABLE.has(name)) {
        if (isNullLiteral(ctx)) return "operable control: context must describe what the AI can do here — not null";
        if (isNullLiteral(meta)) return "operable control: meta must list concern tags — not null";
        return null;
    }
    if (hasHandler(props)) return null;
    if (!isNullLiteral(ctx)) return "static element (no operationability): context must be null — avoid AI-target noise";
    if (!isNullLiteral(meta)) return "static element: meta must be null";
    return null;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Every factory element declares context + meta, matched to its operationability." },
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
                if (!name || !COVERED.has(name)) return;
                const problem = diagnose(name, propsObject(node));
                if (!problem) return;

                const t = trace(node, raw, mod);
                context.report({
                    node,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "require-context-meta",
                            narrative: `${name}(): ${problem}`,
                            graph: {
                                X: `${t.file}:${t.line} — ${name}() in ${t.context}`,
                                Y: `the AI meta-tag index either misses an operable control or ingests static noise it cant operate`,
                                Z: `no_separation — operationability + its description live apart`,
                                W: `mis-tagged elements teach the AI to target what it cant operate, or hide what it can`,
                            },
                            remediation: `Operable control (button/input/select/textarea/form/anchor/details, or a clickable target): context: "<what the AI does>" + meta: ["<concern>", ...]. Static/layout/display (or a delegation container): context: null, meta: null.`,
                            trace: t,
                        }),
                    },
                });
            },
        };
    },
};
