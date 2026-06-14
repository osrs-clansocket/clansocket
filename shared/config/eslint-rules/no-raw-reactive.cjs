/**
 * LVI/no-raw-reactive — values flowing from dynamic-source modules (/state/**, /ai/**)
 * into the factory's text / attrs / setText / setAttr / setHTML chokepoints MUST be
 * wrapped in signal()/derived(). A raw-string snapshot bypasses reactivity — the UI
 * goes stale silently.
 *
 * The factory's text/attrs/setText/setAttr/setHTML are the only points where UI text
 * meets DOM. They now accept `string | ReadSignal<string>`. Passing a static string
 * is fine. Passing an imported state value as a string is a bypass — it captures the
 * value at call time and the DOM never updates again.
 *
 * Caught patterns (outside src/dom/factory/**):
 *   import { user } from "../state/identity";
 *   span({ text: user.name });            // bypass: user.name resolved once
 *   inst.setText(user.email);             // bypass
 *   div({ attrs: { title: user.handle }}); // bypass
 *
 * Allowed:
 *   span({ text: "hello" })               // literal
 *   span({ text: userNameSig })           // identifier from local scope (assumed signal)
 *   span({ text: derived(() => user.name) }) // call expression
 *   span({ text: `static template` })     // template with no expressions
 *
 * Exempt files: src/dom/factory/**, src/state/** (state modules author the sources).
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const DYNAMIC_SOURCE_SUBSTRINGS = ["/state/"];
const EXEMPT_PATH_SEGMENTS = ["/dom/factory/", "/state/"];
const REACTIVE_PROP_NAMES = new Set(["text"]);
const ATTRS_PROP_NAME = "attrs";
const REACTIVE_SETTERS = new Set(["setText", "setHTML", "setAttr"]);
const ASYNC_MUTATION_METHODS = new Set([
    "setText", "setHTML", "setAttr", "removeAttr",
    "setChildren", "addChild", "addFirst", "addBefore",
]);
const VALUE_BEARING_METHODS = new Set(["setText", "setHTML", "setAttr"]);

function isLiteralValue(node) {
    if (!node) return false;
    if (node.type === "Literal") return true;
    if (node.type === "TemplateLiteral" && node.expressions.length === 0) return true;
    if (node.type === "UnaryExpression" && node.argument && node.argument.type === "Literal") return true;
    return false;
}

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) if (normPath.includes(seg)) return true;
    return false;
}

function isDynamicImportSource(source) {
    for (const sub of DYNAMIC_SOURCE_SUBSTRINGS) if (source.includes(sub)) return true;
    return false;
}

function collectDynamicImports(programNode) {
    const names = new Set();
    for (const stmt of programNode.body) {
        if (stmt.type !== "ImportDeclaration") continue;
        if (typeof stmt.source.value !== "string") continue;
        if (!isDynamicImportSource(stmt.source.value)) continue;
        for (const spec of stmt.specifiers) {
            if (spec.local && spec.local.name) names.add(spec.local.name);
        }
    }
    return names;
}

function rootObject(node) {
    let cur = node;
    while (cur && cur.type === "MemberExpression") cur = cur.object;
    return cur;
}

const SNAPSHOT_HELPER_NAME = "snapshot";

function isSnapshotCall(node) {
    if (!node || node.type !== "CallExpression") return false;
    const callee = node.callee;
    if (callee.type === "Identifier") return callee.name === SNAPSHOT_HELPER_NAME;
    if (callee.type === "MemberExpression" && callee.property) return callee.property.name === SNAPSHOT_HELPER_NAME;
    return false;
}

const STORAGE_OBJECTS = new Set(["localStorage", "sessionStorage"]);
const STORAGE_READ_METHODS = new Set(["getItem", "key"]);

function isStorageRead(node) {
    if (!node || node.type !== "CallExpression") return false;
    const callee = node.callee;
    if (!callee || callee.type !== "MemberExpression") return false;
    const obj = callee.object;
    if (!obj || obj.type !== "Identifier") return false;
    if (!STORAGE_OBJECTS.has(obj.name)) return false;
    return callee.property && STORAGE_READ_METHODS.has(callee.property.name);
}

function isDynamicValue(node, dynamicNames) {
    if (!node) return false;
    if (isSnapshotCall(node)) return false;
    if (isStorageRead(node)) return true;
    if (node.type === "Identifier") return dynamicNames.has(node.name);
    if (node.type === "MemberExpression") {
        const root = rootObject(node);
        return root && root.type === "Identifier" && dynamicNames.has(root.name);
    }
    if (node.type === "AwaitExpression") return isDynamicValue(node.argument, dynamicNames);
    if (node.type === "ChainExpression") return isDynamicValue(node.expression, dynamicNames);
    if (node.type === "CallExpression") {
        const root = rootObject(node.callee);
        return root && root.type === "Identifier" && dynamicNames.has(root.name);
    }
    if (node.type === "LogicalExpression" || node.type === "BinaryExpression") {
        return isDynamicValue(node.left, dynamicNames) || isDynamicValue(node.right, dynamicNames);
    }
    if (node.type === "ConditionalExpression") {
        return isDynamicValue(node.consequent, dynamicNames) || isDynamicValue(node.alternate, dynamicNames);
    }
    if (node.type === "TemplateLiteral" || node.type === "SequenceExpression") {
        return node.expressions.some((e) => isDynamicValue(e, dynamicNames));
    }
    if (node.type === "TSNonNullExpression" || node.type === "TSAsExpression") {
        return isDynamicValue(node.expression, dynamicNames);
    }
    return false;
}

function addPatternToDynamic(pattern, dynamicNames) {
    if (!pattern) return;
    if (pattern.type === "Identifier") { dynamicNames.add(pattern.name); return; }
    if (pattern.type === "ObjectPattern") {
        for (const prop of pattern.properties) {
            if (prop.type === "Property") addPatternToDynamic(prop.value, dynamicNames);
            else if (prop.type === "RestElement") addPatternToDynamic(prop.argument, dynamicNames);
        }
        return;
    }
    if (pattern.type === "ArrayPattern") {
        for (const elem of pattern.elements) addPatternToDynamic(elem, dynamicNames);
        return;
    }
    if (pattern.type === "RestElement") { addPatternToDynamic(pattern.argument, dynamicNames); return; }
    if (pattern.type === "AssignmentPattern") { addPatternToDynamic(pattern.left, dynamicNames); return; }
}

function propKeyName(prop) {
    if (!prop.key) return null;
    if (prop.key.type === "Identifier") return prop.key.name;
    if (prop.key.type === "Literal" && typeof prop.key.value === "string") return prop.key.value;
    return null;
}

const TIMER_NAMES = new Set(["setInterval", "setTimeout"]);
const EVENT_BUS_IDENTIFIER = "events";
const EVENT_BUS_METHOD = "on";
const STREAM_MESSAGE_EVENTS = new Set(["message", "open", "data"]);
const SUB_PREFIXES = ["open", "subscribe", "observe", "watch"];
const SUB_SUFFIXES = ["Stream", "Source", "Feed", "Channel", "Sub", "Subscription"];

function memberMethod(callee) {
    if (!callee || callee.type !== "MemberExpression") return null;
    return callee.property && callee.property.name;
}

function walkNodes(node, visit) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const child of node) walkNodes(child, visit);
        return;
    }
    if (!node.type) return;
    visit(node);
    for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "range") continue;
        walkNodes(node[key], visit);
    }
}

function bodyMutatesDom(fnBody) {
    let found = false;
    walkNodes(fnBody, (node) => {
        if (found) return;
        if (node.type !== "CallExpression") return;
        const method = memberMethod(node.callee);
        if (!method || !ASYNC_MUTATION_METHODS.has(method)) return;
        const arg = method === "setAttr" ? node.arguments[1] : node.arguments[0];
        if (arg && isSnapshotCall(arg)) return;
        if (VALUE_BEARING_METHODS.has(method) && isLiteralValue(arg)) return;
        found = true;
    });
    return found;
}

function nameOfFunction(node) {
    if (node.type === "FunctionDeclaration" && node.id) return node.id.name;
    if (node.type === "VariableDeclarator" && node.id && node.id.type === "Identifier") return node.id.name;
    return null;
}

function callbackArgFor(callExpr, kind) {
    if (kind === "stream") return callExpr.arguments[1];
    if (kind === "events.on") return callExpr.arguments[1];
    if (kind === "timer") return callExpr.arguments[0];
    if (kind === "subscription") {
        const args = callExpr.arguments;
        for (let i = args.length - 1; i >= 0; i--) {
            const arg = args[i];
            if (arg && (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression" || arg.type === "Identifier")) return arg;
        }
    }
    return null;
}

function callbackCallsMutator(callbackNode, mutatingNames) {
    if (!callbackNode) return false;
    if (callbackNode.type === "Identifier") return mutatingNames.has(callbackNode.name);
    if (callbackNode.type !== "ArrowFunctionExpression" && callbackNode.type !== "FunctionExpression") return false;
    let found = false;
    walkNodes(callbackNode.body, (node) => {
        if (found) return;
        if (node.type !== "CallExpression") return;
        const callee = node.callee;
        if (callee.type === "Identifier" && mutatingNames.has(callee.name)) found = true;
    });
    return found;
}

function isTimerCall(callee) {
    if (callee.type === "Identifier" && TIMER_NAMES.has(callee.name)) return true;
    const method = memberMethod(callee);
    return method !== null && TIMER_NAMES.has(method);
}

function isEventBusOnCall(callee) {
    if (callee.type !== "MemberExpression") return false;
    if (!callee.object || callee.object.type !== "Identifier") return false;
    if (callee.object.name !== EVENT_BUS_IDENTIFIER) return false;
    return callee.property && callee.property.name === EVENT_BUS_METHOD;
}

function isAddEventListenerCall(node) {
    if (node.type !== "CallExpression") return false;
    if (memberMethod(node.callee) !== "addEventListener") return false;
    const first = node.arguments[0];
    if (!first || first.type !== "Literal" || typeof first.value !== "string") return false;
    return STREAM_MESSAGE_EVENTS.has(first.value);
}

function isSubscriptionCall(callee) {
    let name = null;
    if (callee.type === "Identifier") name = callee.name;
    else if (callee.type === "MemberExpression" && callee.property) name = callee.property.name;
    if (!name) return false;
    if (!SUB_PREFIXES.some((p) => name.startsWith(p))) return false;
    return SUB_SUFFIXES.some((s) => name.endsWith(s));
}

function classifyAsyncCallExpression(callExpr) {
    if (isTimerCall(callExpr.callee)) return "timer";
    if (isEventBusOnCall(callExpr.callee)) return "events.on";
    if (isAddEventListenerCall(callExpr)) return "stream";
    if (isSubscriptionCall(callExpr.callee)) return "subscription";
    return null;
}

function findAsyncContext(node) {
    let cur = node.parent;
    while (cur) {
        if (cur.type === "FunctionExpression" || cur.type === "ArrowFunctionExpression") {
            const parent = cur.parent;
            if (parent && parent.type === "CallExpression") {
                const kind = classifyAsyncCallExpression(parent);
                if (kind !== null) return { kind, callExpr: parent };
            }
        }
        cur = cur.parent;
    }
    return null;
}

function reportAsyncBypass(context, node, method, kind) {
    const raw = (context.filename || context.getFilename()).split("\\").join("/");
    const t = trace(node, raw, getModuleForFile(raw));
    const remediation = kind === "timer"
        ? "Replace timer-driven setText with a signal binding. For countdowns, expose a global tick signal and bind text via derived(() => formatRemaining(target, now$())). For polling, the timer should call store.refresh() (or signal.set()); the UI binds once via derived/text: and updates automatically."
        : kind === "events.on"
            ? "events.on callbacks shouldnt mutate DOM directly. Convert the event payload (or the upstream state) into a signal — subscribers bind to the signal via text: / derived() and auto-update. The bus event becomes the trigger that calls store.refresh() or signal.set()."
            : kind === "stream"
                ? "EventSource/WebSocket message handlers shouldnt mutate DOM directly. Pipe the message into a Signal store (e.g. auditStore.entries$.set(prev => [...prev, entry])). The UI binds to the signal once; every message updates the bound DOM automatically without an imperative callback chain."
                : "Subscription callbacks (open*/subscribe*/observe*) deliver values asynchronously — they shouldnt mutate DOM directly. Sink the stream into a signal store and let the factory bindings flow.";
    context.report({
        node,
        messageId: "report",
        data: {
            report: build4DReport({
                rule: "no-raw-reactive",
                narrative: `${method}() fires inside an async callback (${kind}) — the value is delivered out-of-band and the DOM mutation is imperative. The factory's reactive bindings are designed for exactly this; the async source belongs in a Signal that bound DOM reads from.`,
                graph: {
                    X: `${t.file}:${t.line} — ${method}() inside ${kind} callback in ${t.context}`,
                    Y: `every fired ${kind} re-runs the callback and mutates DOM; nothing else can subscribe to the same data, so any other UI showing the same value stays stale`,
                    Z: `no_separation — async data delivery + DOM mutation in the same call site, both at the leaf instead of routed through a store`,
                    W: `every async source forks the propagation graph; later UI consumers that need the same data must hand-wire their own subscriptions; the data flow becomes a fan of callbacks instead of a fan-out of signal subscribers`,
                },
                remediation,
                trace: t,
            }),
        },
    });
}

function reportBypass(context, node, kind, name) {
    const raw = (context.filename || context.getFilename()).split("\\").join("/");
    const t = trace(node, raw, getModuleForFile(raw));
    context.report({
        node,
        messageId: "report",
        data: {
            report: build4DReport({
                rule: "no-raw-reactive",
                narrative: `Dynamic-source value "${name}" flowed into ${kind} as a raw snapshot — the DOM captures it once and goes stale. The factory's text/attrs/setText/setAttr/setHTML accept ReadSignal<string>; wrap dynamic values in signal()/derived() so the UI updates when the source changes.`,
                graph: {
                    X: `${t.file}:${t.line} — ${kind} received imported identifier "${name}" without signal wrapping`,
                    Y: `the factory chokepoint that would have wired an effect treats this as a one-shot string; subsequent updates to the source never reach this DOM node`,
                    Z: `no_separation — reactive intent ("this value changes") split from declaration ("just a string")`,
                    W: `every stale binding is silent rot — the page looks correct on first render and diverges from truth over time without warning`,
                },
                remediation: `Wrap the value at its source: export it as a Signal<string> from the state module, or derive locally with derived(() => "${name}"). Then pass the signal to ${kind}. The factory subscribes and updates the DOM on every change. For one-shot snapshots you genuinely want, hoist the value to a local literal first to make the intent explicit.`,
                trace: t,
            }),
        },
    });
}

function checkObjectProp(context, prop, dynamicNames) {
    const key = propKeyName(prop);
    if (!key) return;
    if (REACTIVE_PROP_NAMES.has(key)) {
        if (isDynamicValue(prop.value, dynamicNames)) {
            reportBypass(context, prop.value, `${key}: prop`, sourceText(prop.value));
        }
        return;
    }
    if (key !== ATTRS_PROP_NAME) return;
    if (!prop.value || prop.value.type !== "ObjectExpression") return;
    for (const innerProp of prop.value.properties) {
        if (innerProp.type !== "Property") continue;
        if (isDynamicValue(innerProp.value, dynamicNames)) {
            const attrKey = propKeyName(innerProp) || "attr";
            reportBypass(context, innerProp.value, `attrs.${attrKey}`, sourceText(innerProp.value));
        }
    }
}

function sourceText(node) {
    if (node.type === "Identifier") return node.name;
    if (node.type === "MemberExpression") {
        const root = rootObject(node);
        const rootName = root && root.type === "Identifier" ? root.name : "?";
        return `${rootName}…`;
    }
    return "?";
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban raw snapshots of dynamic-source values flowing into the factory's reactive chokepoints." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        if (isExemptPath(raw)) return {};
        let dynamicNames = new Set();
        const mutatingNames = new Set();
        const asyncRegistrations = [];
        return {
            Program(node) { dynamicNames = collectDynamicImports(node); },
            FunctionDeclaration(node) {
                if (!node.id) return;
                if (bodyMutatesDom(node.body)) mutatingNames.add(node.id.name);
            },
            VariableDeclarator(node) {
                if (dynamicNames.size > 0 && node.init && isDynamicValue(node.init, dynamicNames)) {
                    addPatternToDynamic(node.id, dynamicNames);
                }
                const name = nameOfFunction(node);
                if (!name) return;
                if (!node.init) return;
                if (node.init.type !== "ArrowFunctionExpression" && node.init.type !== "FunctionExpression") return;
                if (bodyMutatesDom(node.init.body)) mutatingNames.add(name);
            },
            "Program:exit"() {
                for (const reg of asyncRegistrations) {
                    if (callbackCallsMutator(reg.callback, mutatingNames)) {
                        reportAsyncBypass(context, reg.callExpr, "callback", reg.kind);
                    }
                }
            },
            ArrowFunctionExpression(node) {
                if (dynamicNames.size === 0) return;
                if (!node.parent || node.parent.type !== "CallExpression") return;
                const root = rootObject(node.parent.callee);
                if (!root || root.type !== "Identifier" || !dynamicNames.has(root.name)) return;
                for (const param of node.params) addPatternToDynamic(param, dynamicNames);
            },
            FunctionExpression(node) {
                if (dynamicNames.size === 0) return;
                if (!node.parent || node.parent.type !== "CallExpression") return;
                const root = rootObject(node.parent.callee);
                if (!root || root.type !== "Identifier" || !dynamicNames.has(root.name)) return;
                for (const param of node.params) addPatternToDynamic(param, dynamicNames);
            },
            ObjectExpression(node) {
                if (dynamicNames.size === 0) return;
                for (const prop of node.properties) {
                    if (prop.type !== "Property") continue;
                    checkObjectProp(context, prop, dynamicNames);
                }
            },
            CallExpression(node) {
                const kind = classifyAsyncCallExpression(node);
                if (kind !== null) {
                    const cb = callbackArgFor(node, kind);
                    if (cb) asyncRegistrations.push({ callExpr: node, callback: cb, kind });
                }
                const callee = node.callee;
                if (!callee || callee.type !== "MemberExpression") return;
                const method = callee.property && callee.property.name;
                if (REACTIVE_SETTERS.has(method)) {
                    const valueArg = method === "setAttr" ? node.arguments[1] : node.arguments[0];
                    if (valueArg && isSnapshotCall(valueArg)) return;
                    if (isLiteralValue(valueArg)) return;
                    const asyncCtx = findAsyncContext(node);
                    if (asyncCtx !== null) {
                        reportAsyncBypass(context, node, method, asyncCtx.kind);
                        return;
                    }
                    if (dynamicNames.size > 0 && isDynamicValue(valueArg, dynamicNames)) {
                        reportBypass(context, valueArg, `${method}()`, sourceText(valueArg));
                    }
                    return;
                }
                if (ASYNC_MUTATION_METHODS.has(method)) {
                    const valueArg = method === "setAttr" ? node.arguments[1] : node.arguments[0];
                    if (VALUE_BEARING_METHODS.has(method) && isLiteralValue(valueArg)) return;
                    if (valueArg && isSnapshotCall(valueArg)) return;
                    const asyncCtx = findAsyncContext(node);
                    if (asyncCtx !== null) reportAsyncBypass(context, node, method, asyncCtx.kind);
                }
            },
        };
    },
};
