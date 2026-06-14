/**
 * LVI/require-style-class — Text-bearing factory calls must carry an explicit `classes` prop.
 *
 * Flags:
 *   span({ text: "..." })             — no `classes` → renders at browser-default font-size
 *   label({...}, [children])          — no `classes` and has children → wrapped form control
 *                                       gets no layout class, browser-default sizing leaks
 *   paragraph({ text: "..." })        — no `classes` → unsized text node
 *   heading(tag, { text: "..." })     — no `classes` → unsized heading
 *
 * Why this matters: the dashboard's CSS token gate (stylelint + vite-plugin) scans CSS
 * files, not DOM. An anonymous `label({}, [input, span({text})])` produces a `<label>`
 * with no class, no inline style, and no inherited sizing rule → it falls through to
 * browser default 1rem (~16px), which is 2-3x the tokenized 0.5-0.625rem the rest of
 * the app uses. The CSS gate cant see this. The factory gate (lvi/no-raw-dom,
 * lvi/require-component) only ensures factory functions are CALLED, not that the
 * elements they produce will inherit a sized class. This rule plugs that hole.
 *
 * Skip cases:
 *   span({ classes: [...] })          — has classes (even if empty array? no — empty fails)
 *   span({}, [child])                 — pure layout container with no own text, skip
 *   span({ classes: ["bi", "bi-x"] }) — icon, has classes, pass
 *   label({})                         — empty / hidden marker, skip (only flag if has children)
 *
 * Escape hatch (use sparingly, with a reason on the line above):
 *   // eslint-disable-next-line lvi/require-style-class -- inherits sizing from .parent
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const TEXT_FACTORIES = new Set(["span", "paragraph"]);

function calleeName(call) {
    const c = call.callee;
    if (!c) return null;
    if (c.type === "Identifier") return c.name;
    if (c.type === "MemberExpression" && c.property && c.property.name) return c.property.name;
    return null;
}

function propsArg(call, name) {
    if (!call.arguments || call.arguments.length === 0) return null;
    const idx = name === "heading" ? 1 : 0;
    const arg = call.arguments[idx];
    if (!arg || arg.type !== "ObjectExpression") return null;
    return arg;
}

function childrenArg(call, name) {
    if (!call.arguments) return null;
    const idx = name === "heading" ? 2 : 1;
    const arg = call.arguments[idx];
    if (!arg || arg.type !== "ArrayExpression") return null;
    return arg;
}

function propByName(obj, name) {
    for (const prop of obj.properties) {
        if (prop.type !== "Property") continue;
        const k = prop.key && (prop.key.name || prop.key.value);
        if (k === name) return prop;
    }
    return null;
}

function hasNonEmptyClasses(propsObj) {
    if (!propsObj) return false;
    const p = propByName(propsObj, "classes");
    if (!p || !p.value) return false;
    if (p.value.type === "ArrayExpression") return p.value.elements.length > 0;
    return true;
}

function hasTextProp(propsObj) {
    if (!propsObj) return false;
    const p = propByName(propsObj, "text");
    if (!p || !p.value) return false;
    if (p.value.type === "Literal") return typeof p.value.value === "string" && p.value.value.length > 0;
    return true;
}

function buildReport(rule, factoryName, narrative, t) {
    return build4DReport({
        rule,
        narrative,
        graph: {
            X: `${t.file}:${t.line} — ${factoryName}() call has no \`classes\` prop in ${t.context}`,
            Y: `the element inherits browser-default font-size (~1rem), towering over the tokenized 0.5–0.625rem siblings around it`,
            Z: `no_implicit (RequireExplicitStyling) — text-bearing elements without a class fall through CSS gates: the token gate scans CSS files, the factory gate ensures factory usage. An unclassed element passes both while rendering at default browser size.`,
            W: `every unclassed text-bearing element produces visible size mismatches that escape every architectural check`,
        },
        remediation: `Add a \`classes: ["..."]\` prop with a class that sets a tokenized font-size (e.g. \`profile__radio-text\`, \`profile__field-label\`, \`profile__instructions\`). If the element legitimately inherits from a sized parent, add \`// eslint-disable-next-line lvi/require-style-class -- inherits from .parent-class\` immediately above, naming the parent.`,
        trace: t,
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Text-bearing factory calls require an explicit `classes` prop to anchor a tokenized font-size." },
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

                if (TEXT_FACTORIES.has(name)) {
                    const props = propsArg(node, name);
                    if (!props) return;
                    if (!hasTextProp(props)) return;
                    if (hasNonEmptyClasses(props)) return;
                    const t = trace(node, raw, mod);
                    const narrative = `${name}({ text }) factory call has no \`classes\` prop. Text-bearing elements without a class inherit browser-default font-size, bypassing the tokenized 0.5–0.625rem the rest of the form uses.`;
                    context.report({
                        node,
                        messageId: "report",
                        data: { report: buildReport("require-style-class", name, narrative, t) },
                    });
                    return;
                }

                if (name === "label") {
                    const props = propsArg(node, name);
                    if (!props) return;
                    const kids = childrenArg(node, name);
                    if (!kids || kids.elements.length === 0) return;
                    if (hasNonEmptyClasses(props)) return;
                    const t = trace(node, raw, mod);
                    const narrative = `label({}, [...]) wraps form controls without a layout class. The label and its children inherit browser-default sizing — radios + their text spans render at ~1rem, 2x the tokenized 0.5rem.`;
                    context.report({
                        node,
                        messageId: "report",
                        data: { report: buildReport("require-style-class", name, narrative, t) },
                    });
                    return;
                }

                if (name === "heading") {
                    const props = propsArg(node, name);
                    if (!props) return;
                    if (!hasTextProp(props)) return;
                    if (hasNonEmptyClasses(props)) return;
                    const t = trace(node, raw, mod);
                    const narrative = `heading({ text }) factory call has no \`classes\` prop. Heading elements without a class fall through to browser-default UA stylesheet sizing instead of the section's typography tokens.`;
                    context.report({
                        node,
                        messageId: "report",
                        data: { report: buildReport("require-style-class", "heading", narrative, t) },
                    });
                }
            },
        };
    },
};
