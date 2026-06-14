/**
 * LVI/no-raw-animation — animation management lives in the dom-factory, period.
 *
 * the dom-factory exposes a single `effects:` prop on every factory call that
 * routes through applyEffects(el, descriptor) in dom/factory/effect-helpers.ts.
 * descriptors carry name + trigger (mount|intersect) + delay + once semantics
 * and map to a centralized `.fx-{name}` CSS class. staggered groups use the
 * staggerDelay / staggerEffect helpers (also factory-exported).
 *
 * forcing every animation through the factory:
 *   - enables uniform cache + reuse (one IntersectionObserver per descriptor)
 *   - makes reduce-motion opt-out automatic (motion-override-global.css scopes
 *     to [class*="fx-"])
 *   - keeps the surface lintable + grepable (every animation = an `effects:`
 *     prop, never inline classList tinkering across feature code)
 *
 * banned patterns (outside dom/factory/**):
 *   el.classList.add("fx-rise")              — bypass; use effects: "rise"
 *   el.classList.add("anim-foo")             — legacy dead class family
 *   el.classList.add(`fx-${name}`)           — template form
 *   el.animate(keyframes, opts)              — Web Animations API bypass
 *   el.style.animation = "..."               — inline animation bypass
 *   el.style.animationName = "..."           — same
 *
 * allowed:
 *   span({ effects: "rise" })                — sanctioned path
 *   span({ effects: { name: "rise", trigger: "intersect", delay: 80, once: true } })
 *   span({ effects: staggerEffect(i, "rise") })
 *
 * exempt files:
 *   dom/factory/**                            — factory implements applyEffects
 *
 * escape hatch:
 *   // eslint-disable-next-line lvi/no-raw-animation
 *   above the offending line, with a one-line WHY.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];
const FX_PREFIX = "fx-";
const LEGACY_ANIM_PREFIX = "anim-";
const CLASS_LIST_PROPERTY = "classList";
const CLASS_LIST_METHODS = new Set(["add", "toggle", "replace"]);
const WEB_ANIMATIONS_METHOD = "animate";
const STYLE_PROPERTY = "style";
const STYLE_ANIMATION_KEYS = new Set(["animation", "animationName", "animationDuration", "animationDelay"]);

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function isFxOrAnimString(value) {
    if (typeof value !== "string") return false;
    return value.startsWith(FX_PREFIX) || value.startsWith(LEGACY_ANIM_PREFIX);
}

function literalIsFxClass(node) {
    if (!node) return false;
    if (node.type === "Literal") return isFxOrAnimString(node.value);
    if (node.type === "TemplateLiteral") {
        const first = node.quasis[0];
        if (!first) return false;
        const cooked = first.value.cooked ?? "";
        return isFxOrAnimString(cooked);
    }
    return false;
}

function memberPropertyName(member) {
    if (!member || member.type !== "MemberExpression") return null;
    if (member.property.type !== "Identifier") return null;
    return member.property.name;
}

function isClassListAddCall(node) {
    if (node.type !== "CallExpression") return false;
    const callee = node.callee;
    if (callee.type !== "MemberExpression") return false;
    const methodName = memberPropertyName(callee);
    if (!methodName || !CLASS_LIST_METHODS.has(methodName)) return false;
    if (memberPropertyName(callee.object) !== CLASS_LIST_PROPERTY) return false;
    return true;
}

function isWebAnimationsCall(node) {
    if (node.type !== "CallExpression") return false;
    const callee = node.callee;
    if (callee.type !== "MemberExpression") return false;
    if (memberPropertyName(callee) !== WEB_ANIMATIONS_METHOD) return false;
    if (node.arguments.length < 1) return false;
    const first = node.arguments[0];
    if (!first) return false;
    return first.type === "ArrayExpression" || first.type === "ObjectExpression" || first.type === "Identifier";
}

function isStyleAnimationAssignment(node) {
    if (node.type !== "AssignmentExpression") return false;
    const left = node.left;
    if (left.type !== "MemberExpression") return false;
    const propName = memberPropertyName(left);
    if (!propName || !STYLE_ANIMATION_KEYS.has(propName)) return false;
    if (memberPropertyName(left.object) !== STYLE_PROPERTY) return false;
    return true;
}

function buildReport(t, surface, remediation) {
    return build4DReport({
        rule: "no-raw-animation",
        narrative:
            `Feature code is driving an animation outside the dom-factory's centralized effects: pipeline. ` +
            `Every animation must flow through the factory effects: prop so that ` +
            `(1) reduce-motion opt-out works automatically, (2) IntersectionObservers are shared not duplicated, ` +
            `(3) the surface is lintable + grepable — every animation = an effects: site, never inline classList churn.`,
        graph: {
            X: `${t.file}:${t.line} — ${surface} in ${t.context}`,
            Y: `the animation fires but bypasses the centralized effect path; reduce-motion + caching + uniformity all leak around it`,
            Z: `no_separation — animation logic lives both in dom/factory/effect-helpers.ts AND inline in this feature file (two truths)`,
            W: `pages drift apart in motion behavior; reduce-motion users may see uncontrolled animations; observer count grows linearly per callsite instead of staying centralized`,
        },
        remediation,
        trace: t,
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Force animation management through the dom-factory effects: prop." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = normalizePath(context.filename || context.getFilename());
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);

        return {
            CallExpression(node) {
                if (isClassListAddCall(node)) {
                    for (const arg of node.arguments) {
                        if (!literalIsFxClass(arg)) continue;
                        const t = trace(node, raw, mod);
                        context.report({
                            node,
                            messageId: "report",
                            data: {
                                report: buildReport(
                                    t,
                                    "raw classList.add of an fx-/anim- class",
                                    `Pass the effect through the factory: replace the classList.add(...) with an effects: prop on the factory call that creates this element. ` +
                                        `Example: replace \`el.classList.add("fx-rise")\` with the original factory call \`span({ ..., effects: "rise" })\` (or \`effects: { name: "rise", trigger: "intersect", once: true }\` for scroll-triggered).`,
                                ),
                            },
                        });
                        return;
                    }
                    return;
                }
                if (isWebAnimationsCall(node)) {
                    const t = trace(node, raw, mod);
                    context.report({
                        node,
                        messageId: "report",
                        data: {
                            report: buildReport(
                                t,
                                "raw .animate() Web Animations API call",
                                `Express the animation as a centralized .fx-<name> CSS effect at styles/effects/fx/<name>-effect.css, then trigger via the factory's effects: prop. ` +
                                    `If a one-off keyframe sequence is genuinely needed and CSS cant express it, add it to the fx/ directory anyway — animation lives there by contract.`,
                            ),
                        },
                    });
                }
            },
            AssignmentExpression(node) {
                if (!isStyleAnimationAssignment(node)) return;
                const t = trace(node, raw, mod);
                context.report({
                    node,
                    messageId: "report",
                    data: {
                        report: buildReport(
                            t,
                            "inline .style.animation* assignment",
                            `Remove the inline style.animation assignment and add a centralized .fx-<name> class at styles/effects/fx/<name>-effect.css. ` +
                                `Trigger it from the factory call: \`div({ ..., effects: "name" })\`.`,
                        ),
                    },
                });
            },
        };
    },
};
