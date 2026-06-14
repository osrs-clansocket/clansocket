/**
 * LVI/no-raw-effect — visual effects (pulse, glow, shimmer, flash, etc) must
 * route through the factory's `effects` prop / `addEffect` method, NOT raw
 * `classList.add("teams__card--pulse")` or `inst.toggleClass("member-name--glow-pulse")`.
 *
 * The factory owns the `.fx-*` registry (see DESIGN-GUIDE.md section 12d). Every
 * pulse / glow / shimmer / flash / fade / rise / shake / breathe variant lives
 * in `effects.css` as `.fx-<intent>`. Feature code binds via:
 *   button({ effects: ["pulse-attention"] })          // declarative
 *   inst.addEffect("flash-error")                     // dynamic
 *
 * Why: per-section BEM-modifier effects (.teams__card--pulse,
 * .clans-clan__plugin-badge--live, .member-name--glow-pulse, ...) drift
 * independently. A new component cant opt into "pulse-attention" without
 * authoring a new section-scoped keyframe. The registry collapses all variants
 * into ONE source of truth — one keyframe, one selector, one reduced-motion
 * carve-out covers everything.
 *
 * Caught patterns (outside src/dom/factory/**):
 *   inst.el.classList.add("teams__card--pulse")
 *   inst.el.classList.toggle("member-name--glow-pulse", on)
 *   inst.toggleClass("clans-manage__audit-row--fresh")
 *   element.classList.remove("ref-highlight")
 *
 * Allowed (NOT caught):
 *   inst.el.classList.add("fx-pulse-attention")    — registry class
 *   inst.el.classList.add("is-loading")            — state convention (drives but isnt visual)
 *   inst.el.classList.add("ai-bar--expanded")      — pure state modifier (no effect keyword)
 *   inst.addEffect("pulse-attention")              — the GOOD path
 *
 * Exempt files:
 *   src/dom/factory/**                              — factory wires its own internal CLASS_LOADING etc
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const EFFECT_KEYWORDS = new Set([
    "pulse",
    "glow",
    "shimmer",
    "flash",
    "fade",
    "rise",
    "shake",
    "breathe",
    "attention",
    "highlight",
    "rainbow",
    "gradient-shift",
]);

const STATE_ALLOWLIST = new Set([
    "is-loading",
    "is-active",
    "is-open",
    "is-dragging",
    "is-expanded",
    "is-busy",
]);

const KNOWN_EFFECT_CLASSES = new Set([
    "teams__card--pulse",
    "member-name--glow-pulse",
    "member-name--gradient-shift",
    "member-name--shimmer",
    "member-name--rainbow",
    "ref-highlight",
]);

const FX_PREFIX = "fx-";
const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];
const MUTATING_CLASSLIST_METHODS = new Set(["add", "toggle", "remove"]);
const FACTORY_CLASS_METHOD = "toggleClass";

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function classNameHasEffectKeyword(cls) {
    const tokens = cls.split("-").filter((t) => t.length > 0);
    for (const tok of tokens) if (EFFECT_KEYWORDS.has(tok)) return true;
    if (EFFECT_KEYWORDS.has("gradient-shift") && cls.includes("gradient-shift")) return true;
    return false;
}

function isEffectClass(cls) {
    if (cls.startsWith(FX_PREFIX)) return false;
    if (STATE_ALLOWLIST.has(cls)) return false;
    if (KNOWN_EFFECT_CLASSES.has(cls)) return true;
    return classNameHasEffectKeyword(cls);
}

function isKnownEffectLiteral(cls) {
    return KNOWN_EFFECT_CLASSES.has(cls);
}

function isClasslistCall(node) {
    const callee = node.callee;
    if (!callee || callee.type !== "MemberExpression") return false;
    const methodName = callee.property && callee.property.name;
    if (!MUTATING_CLASSLIST_METHODS.has(methodName)) return false;
    const obj = callee.object;
    if (!obj || obj.type !== "MemberExpression") return false;
    return obj.property && obj.property.name === "classList";
}

function isToggleClassCall(node) {
    const callee = node.callee;
    if (!callee || callee.type !== "MemberExpression") return false;
    return callee.property && callee.property.name === FACTORY_CLASS_METHOD;
}

function extractStringLiteralArgs(node) {
    const out = [];
    for (const arg of node.arguments) {
        if (arg && arg.type === "Literal" && typeof arg.value === "string") out.push(arg.value);
    }
    return out;
}

function suggestedIntent(cls) {
    for (const kw of EFFECT_KEYWORDS) if (cls.includes(kw)) return kw;
    return "intent";
}

function buildRemediation(cls) {
    const intent = suggestedIntent(cls);
    return `Convert to inst.addEffect("${intent}-<variant>") or button({ effects: ["${intent}-<variant>"] }). Register the keyframe + selector in main/dashboard/src/styles/effects.css as .fx-${intent}-<variant>, then delete the per-section .${cls} rule. The single registry collapses BEM-modifier sprawl and pays the prefers-reduced-motion carve-out exactly once.`;
}

function reportEffect(context, node, cls) {
    const raw = (context.filename || context.getFilename()).split("\\").join("/");
    const t = trace(node, raw, getModuleForFile(raw));
    context.report({
        node,
        messageId: "report",
        data: {
            report: build4DReport({
                rule: "no-raw-effect",
                narrative: `Feature code mutated classList with "${cls}" — a visual-effect class outside the factory's .fx-* registry. Effects must route through the factory chokepoint so the single registry, single reduced-motion carve-out, and single intent vocabulary are enforced everywhere.`,
                graph: {
                    X: `${t.file}:${t.line} — classList mutation of "${cls}" in ${t.context}`,
                    Y: `the .fx-* registry in effects.css is bypassed — this class lives in a per-section CSS file with its own keyframe + reduced-motion carve-out, drifting independently from every other pulse/glow/flash in the codebase`,
                    Z: `no_separation — effect definition lives in 2+ places (the factory registry + ad-hoc per-section BEM modifiers)`,
                    W: `every bypass forks the visual vocabulary; a new component cant reuse "${cls}" without copy-pasting the keyframe; reduced-motion carve-outs proliferate; renaming/retuning the effect requires a hunt across section files`,
                },
                remediation: buildRemediation(cls),
                trace: t,
            }),
        },
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban classList mutation of visual-effect classes outside the factory's .fx-* registry." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (isExemptPath(raw)) return {};
        const reportedNodes = new WeakSet();
        return {
            CallExpression(node) {
                if (!isClasslistCall(node) && !isToggleClassCall(node)) return;
                for (const cls of extractStringLiteralArgs(node)) {
                    if (isEffectClass(cls)) {
                        reportEffect(context, node, cls);
                        reportedNodes.add(node);
                    }
                }
            },
            Literal(node) {
                if (typeof node.value !== "string") return;
                if (!isKnownEffectLiteral(node.value)) return;
                if (node.parent && reportedNodes.has(node.parent)) return;
                reportEffect(context, node, node.value);
            },
        };
    },
};
