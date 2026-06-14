/**
 * LVI/no-raw-handler — Event-handler wiring on factory elements must go through
 * the factory's typed props, not raw .el.addEventListener.
 *
 * The factory (src/dom/factory/**) is the single chokepoint for UI authoring.
 * Click handlers (and submit / change / input / key / focus / blur) belong on
 * the factory's typed props — button({ onClick }), form({ onSubmit }),
 * input({ onChange, onInput, onKey }) — so cross-cutting concerns (rapid-click
 * gate, async loading state, selection-clear, confirmation wrap, debounce)
 * are enforced at the factory wrap site, impossible to bypass.
 *
 * Why: a feature-local `inst.el.addEventListener("click", ...)` is a stray
 * handler — it skips every invariant the factory provides AND can never be
 * extended uniformly. The whole point of the factory chokepoint is that
 * extending it ONCE upgrades every consumer.
 *
 * Caught patterns (outside src/dom/factory/**):
 *   inst.el.addEventListener("click", ...)      — bypass via the .el accessor
 *   inst.el.addEventListener("submit", ...)
 *   inst.el.addEventListener("input", ...)
 *   inst.el.addEventListener("change", ...)
 *   inst.el.addEventListener("keydown", ...)
 *   inst.el.addEventListener("keyup", ...)
 *   inst.el.addEventListener("keypress", ...)
 *   inst.el.addEventListener("focus", ...)
 *   inst.el.addEventListener("blur", ...)
 *
 * Allowed (NOT caught):
 *   document.addEventListener(...)   — global delegation pattern (router, audit-client)
 *   window.addEventListener(...)     — viewport / lifecycle listeners
 *   rawEl.addEventListener(...)      — raw HTMLElement (not factory-managed); use sparingly
 *   inst.el.addEventListener("pointerdown", ...)  — non-gated event names fall through
 *
 * Exempt files (factory wires its own internal handlers):
 *   src/dom/factory/**
 *
 * Escape hatch: precede the violating line with
 *   // eslint-disable-next-line lvi/no-raw-handler
 * The no-comments cleaner preserves eslint directives.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const GATED_EVENTS = new Set([
    "click",
    "submit",
    "input",
    "change",
    "keydown",
    "keyup",
    "keypress",
    "focus",
    "blur",
]);

const EXEMPT_PATH_SEGMENTS = ["/dom/factory/"];

const EVENT_TO_PROP = {
    click: "onClick",
    submit: "onSubmit",
    input: "onInput",
    change: "onChange",
    keydown: "onKey",
    keyup: "onKey",
    keypress: "onKey",
    focus: "onFocus",
    blur: "onBlur",
};

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.includes(seg)) return true;
    }
    return false;
}

function isAddEventListenerCall(node) {
    const callee = node.callee;
    if (!callee || callee.type !== "MemberExpression") return false;
    return callee.property && callee.property.name === "addEventListener";
}

function isElReceiver(node) {
    const obj = node.callee.object;
    if (!obj || obj.type !== "MemberExpression") return false;
    return obj.property && obj.property.name === "el";
}

function extractEventName(node) {
    if (!node.arguments || node.arguments.length === 0) return null;
    const first = node.arguments[0];
    if (!first || first.type !== "Literal") return null;
    if (typeof first.value !== "string") return null;
    return first.value;
}

function remediationFor(eventName) {
    const prop = EVENT_TO_PROP[eventName] ?? "the matching factory prop";
    if (eventName === "click") {
        return `Convert to button({ onClick: handler }). The factory wraps the handler with the rapid-click gate, async loading state, and selection-clear automatically. For confirmation flows, use button({ confirmText: "...", onClick: handler }) instead of manually composing glassConfirm.`;
    }
    if (eventName === "submit") {
        return `Convert to form({ onSubmit: handler }, [...]). The factory handles preventDefault + async loading state + submit gate automatically.`;
    }
    if (eventName === "input") {
        return `Convert to input({ onInput: { handler, debounceMs: N } }). The factory bakes in the debounce — no more manual setTimeout/clearTimeout dance.`;
    }
    if (eventName === "change") {
        return `Convert to input({ onChange: handler }) (or select({ onChange })). Factory reads the value and passes it as the first arg.`;
    }
    if (eventName === "keydown" || eventName === "keyup" || eventName === "keypress") {
        return `Convert to input({ onKey: { Enter: handler, Escape: handler, ... } }). Factory dispatches by key name, no more raw e.key === "..." checks.`;
    }
    if (eventName === "focus" || eventName === "blur") {
        return `Convert to input({ ${prop}: handler }). The factory handles focus/blur lifecycle uniformly.`;
    }
    return `Use the factory's typed prop for this event. If the factory doesn't expose it yet, EXTEND the factory rather than bypass it.`;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban inst.el.addEventListener for gated user-interaction events outside the factory layer." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);

        return {
            CallExpression(node) {
                if (!isAddEventListenerCall(node)) return;
                if (!isElReceiver(node)) return;
                const eventName = extractEventName(node);
                if (!eventName || !GATED_EVENTS.has(eventName)) return;

                const t = trace(node, raw, mod);
                const prop = EVENT_TO_PROP[eventName] ?? "the matching factory prop";
                context.report({
                    node,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "no-raw-handler",
                            narrative: `Feature code wired a "${eventName}" handler via inst.el.addEventListener — bypassing the factory's ${prop} prop. The factory is the single point where cross-cutting handler invariants (rapid-click gate, async loading state, selection-clear, confirmation wrap, debounce) get enforced; every bypass is a stray handler that escapes those invariants.`,
                            graph: {
                                X: `${t.file}:${t.line} — inst.el.addEventListener("${eventName}", ...) in ${t.context}`,
                                Y: `the factory's ${prop} prop is bypassed — rapid-click gate, async loading state, selection-clear, debounce, confirmation wrap all miss this handler`,
                                Z: `no_separation — event wiring lives in two places (factory props + ad-hoc inst.el.addEventListener)`,
                                W: `every bypass drifts independently; future cross-cutting handler concerns added to the factory dont reach these sites; refactors must hunt them down by hand`,
                            },
                            remediation: remediationFor(eventName),
                            trace: t,
                        }),
                    },
                });
            },
        };
    },
};
