/**
 * LVI/no-raw-attrs — `attrs: {...}` is banned outside the factory layer.
 *
 * The factory exposes typed props for every supported HTML/ARIA/data attribute
 * (ariaLabel, ariaHidden, type, placeholder, autocomplete, maxlength, data: {},
 * etc — see src/dom/factory/core/types.ts BuildSpec / BaseProps / HtmlAttrProps
 * / AriaProps / DatasetProps). Feature code must use those typed props.
 *
 * If a factory call needs an attribute the factory does NOT have a typed prop
 * for yet, the answer is to extend the factory — add the typed field to
 * HtmlAttrProps (or AriaProps), wire it through build.ts, then use the new
 * prop at the call site. The `attrs:` escape hatch is reserved for the
 * factory implementation only, where the merge-attribute machinery lives.
 *
 * Why this matters:
 *   - typed props give discoverability via IDE + type-check
 *   - eliminates raw-string literal duplication (cross-file rule flags repeats)
 *   - new factory invariants (a11y enforcement, instrumentation) reach all
 *     consumers without needing to grep for `attrs:` blocks
 *   - one source of truth for which attributes the factory understands
 *
 * Exempt paths (factory IS the chokepoint):
 *   src/dom/factory/**
 *
 * No inline disables. If extending the factory is genuinely impossible for a
 * specific stray attribute (rare; usually it isnt), open a discussion.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function getAttrsProperty(node) {
    if (!node || !node.properties) return null;
    for (const prop of node.properties) {
        if (prop.type !== "Property") continue;
        if (prop.key.type === "Identifier" && prop.key.name === "attrs") return prop;
        if (prop.key.type === "Literal" && prop.key.value === "attrs") return prop;
    }
    return null;
}

function collectAttrKeys(attrsProp) {
    if (!attrsProp.value || attrsProp.value.type !== "ObjectExpression") return [];
    const keys = [];
    for (const p of attrsProp.value.properties) {
        if (p.type !== "Property") continue;
        if (p.key.type === "Identifier") keys.push(p.key.name);
        else if (p.key.type === "Literal") keys.push(String(p.key.value));
    }
    return keys;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban `attrs: {...}` outside the factory layer — use typed props on the factory call." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);

        return {
            ObjectExpression(node) {
                const attrsProp = getAttrsProperty(node);
                if (!attrsProp) return;
                const keys = collectAttrKeys(attrsProp);
                const keysPreview = keys.length === 0
                    ? "(no keys detected)"
                    : keys.slice(0, 6).join(", ") + (keys.length > 6 ? `, +${keys.length - 6} more` : "");
                const t = trace(attrsProp, raw, mod);
                context.report({
                    node: attrsProp,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "no-raw-attrs",
                            narrative: `Feature code passed \`attrs: { ${keysPreview} }\` to a factory call. Every supported attribute is a typed prop on BuildSpec/BaseProps — use those. If the attribute isnt typed yet, extend the factory rather than bypass it.`,
                            graph: {
                                X: `${t.file}:${t.line} — \`attrs: {...}\` in ${t.context}`,
                                Y: `the factory has typed props for ARIA + common HTML attrs + data — \`attrs:\` here ignores them and leaks raw key strings into feature code`,
                                Z: `no_separation — attribute authoring lives in two places (typed factory props + ad-hoc attrs blocks)`,
                                W: `every \`attrs:\` block is a literal-dup magnet; future invariants added to the factory miss these stray attrs; refactors must hunt them down by hand`,
                            },
                            remediation: `Move each key in attrs to its typed equivalent: ARIA → \`ariaLabel / ariaHidden / aria...\`, common HTML → \`type / placeholder / maxlength / autocomplete / href / ...\`, data-* → \`data: { key: value }\`. If a key has no typed prop yet, ADD one to HtmlAttrProps (or AriaProps) in src/dom/factory/core/types.ts and wire it through src/dom/factory/core/build.ts.`,
                            trace: t,
                        }),
                    },
                });
            },
        };
    },
};
