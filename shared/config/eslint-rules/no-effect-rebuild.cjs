/**
 * LVI/no-effect-rebuild — Reactive effects must not destroy-and-rebuild DOM children.
 *
 * Patterns flagged (anywhere reachable from an `effect(() => { ... })` callback,
 * including via named-function indirection AND via array-iteration callback indirection
 * (`.map` / `.forEach` / `.filter` / `.reduce` / `.flatMap` / `.find` / `.findIndex`
 * / `.some` / `.every`) in the same file):
 *
 *   1. `inst.setChildren(...arr.map(buildFn))`
 *   2. `inst.setChildren(...anyArr)` — spread argument is the giveaway; legitimate
 *      one-time composition uses the children-array CONSTRUCTOR (`div({}, [a, b])`),
 *      not post-hoc setChildren-spread.
 *   3. `inst.setChildren(x1, x2, ..., xn)` where any xi is an inline call to a
 *      known factory primitive (image, span, div, button, ...). The freshly-built
 *      child is recreated on every effect tick.
 *   4. `inst.clear()` followed by `inst.addChild(buildFn(x))` inside a loop
 *      (destructive replace, dressed differently) — loops include both syntactic
 *      `for`/`while` AND functional iteration via `.map`/`.forEach`/`.filter`/etc.
 *   5. `inst.addChild(factoryPrimitive({...}))` where the arg is an inline call
 *      to a known factory primitive — UNLESS guarded by a pool-miss pattern:
 *        if (!pool.has(key))   if (x === undefined)   if (x === null)
 *
 * Indirection handling: when an `effect()` callback calls a NAMED function
 * defined in the same file, the rule walks INTO that function's body — and now
 * carries the current `inLoop` state across the call boundary, so a named function
 * called from inside a loop has its body treated as loop-reachable. Additionally,
 * inline arrow callbacks passed to array-iteration methods (`.map(arrow)`,
 * `.forEach(arrow)`, etc.) are walked too — closing the gap where
 * `effect(() => arr.map(p => addChild(...)))` previously slipped through because
 * the walker skipped function bodies indiscriminately.
 *
 * Why this matters:
 *   <img> elements re-decode their bitmaps when re-mounted, causing flicker
 *   between unmount and bitmap-ready. Each tick destroys + recreates every
 *   stable element — including rank icons, rsn icons, item icons, sprites.
 *   The fix is per-key element stability: build once, patch text/attrs in place,
 *   only mount/unmount on actual key add/remove.
 *
 * Proper alternatives:
 *   A. createLiveStore<Row>({...}) + liveView({mountRow, patchRow})
 *      Precedent: main/dashboard/src/dom/clans/manage-tabs/audit/index.ts
 *   B. Per-key Instance pool with patchRow + placeRows
 *      Precedent: main/dashboard/src/dom/clans/render-clan-map.ts
 *   C. Stable refs built ONCE outside the effect with setText/setAttr/style.*
 *      patches inside. Precedent: main/dashboard/src/dom/clans/clan-map/names.ts
 *   D. Pass reactive props to factory primitives. `image({ src: signal })` and
 *      `paragraph({ text: signal })` bind via writeAttr/writeText and mutate the
 *      persistent element on emit — no rebuild needed. Precedent:
 *      main/dashboard/src/dom/factory/content-ops/graphics/media.ts.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const FACTORY_PRIMITIVES = new Set([
    "div",
    "span",
    "paragraph",
    "heading",
    "image",
    "icon",
    "anchor",
    "button",
    "label",
    "input",
    "textarea",
    "select",
    "option",
    "form",
    "fieldset",
    "rsnTag",
    "clanAvatarInner",
    "card",
    "kpiTile",
    "chartCard",
    "listCard",
    "clanMap",
    "dataTable",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "scratchCanvas",
    "section",
    "article",
    "header",
    "footer",
    "nav",
    "main",
    "aside",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
]);

const ARRAY_LOOP_METHODS = new Set([
    "map",
    "forEach",
    "filter",
    "reduce",
    "flatMap",
    "find",
    "findIndex",
    "some",
    "every",
]);

const LOOP_TYPES = new Set(["ForStatement", "ForOfStatement", "ForInStatement", "WhileStatement", "DoWhileStatement"]);
const FN_TYPES = new Set(["FunctionExpression", "ArrowFunctionExpression", "FunctionDeclaration"]);

function isEffectCall(node) {
    return (
        node.type === "CallExpression" &&
        node.callee.type === "Identifier" &&
        node.callee.name === "effect" &&
        node.arguments.length > 0
    );
}

function isMethodCall(node, method) {
    return (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.callee.property &&
        node.callee.property.name === method
    );
}

function isFactoryPrimitiveCall(node) {
    return (
        node &&
        node.type === "CallExpression" &&
        node.callee.type === "Identifier" &&
        FACTORY_PRIMITIVES.has(node.callee.name)
    );
}

function isArrayLoopMethodCall(node) {
    return (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.callee.property &&
        node.callee.property.name &&
        ARRAY_LOOP_METHODS.has(node.callee.property.name)
    );
}

function isSetChildrenSpread(node) {
    if (!isMethodCall(node, "setChildren")) return false;
    for (const arg of node.arguments) {
        if (arg.type === "SpreadElement") return true;
    }
    return false;
}

function isSetChildrenWithInlineFactory(node) {
    if (!isMethodCall(node, "setChildren")) return false;
    for (const arg of node.arguments) {
        if (arg.type === "SpreadElement") continue;
        if (isFactoryPrimitiveCall(arg)) return true;
    }
    return false;
}

function isAddChildOfFactory(node) {
    if (!isMethodCall(node, "addChild")) return false;
    if (node.arguments.length === 0) return false;
    return isFactoryPrimitiveCall(node.arguments[0]);
}

function isPoolMissGuard(testNode) {
    if (!testNode) return false;
    if (testNode.type === "UnaryExpression" && testNode.operator === "!") {
        const inner = testNode.argument;
        if (
            inner.type === "CallExpression" &&
            inner.callee.type === "MemberExpression" &&
            inner.callee.property &&
            inner.callee.property.name === "has"
        ) {
            return true;
        }
    }
    if (testNode.type === "BinaryExpression" && (testNode.operator === "===" || testNode.operator === "==")) {
        const rhs = testNode.right;
        if (rhs.type === "Identifier" && rhs.name === "undefined") return true;
        if (rhs.type === "Literal" && rhs.value === null) return true;
    }
    return false;
}

function isEarlyContinueGuard(parentBlock, beforeIndex) {
    for (let i = beforeIndex - 1; i >= 0; i--) {
        const sibling = parentBlock.body[i];
        if (
            sibling &&
            sibling.type === "IfStatement" &&
            sibling.test &&
            sibling.test.type === "CallExpression" &&
            sibling.test.callee.type === "MemberExpression" &&
            sibling.test.callee.property &&
            sibling.test.callee.property.name === "has" &&
            sibling.consequent
        ) {
            const cons = sibling.consequent;
            if (cons.type === "ContinueStatement") return true;
            if (
                cons.type === "BlockStatement" &&
                cons.body.length === 1 &&
                cons.body[0].type === "ContinueStatement"
            ) {
                return true;
            }
        }
    }
    return false;
}

function isGuardedByPoolMiss(ancestorsStack) {
    for (let i = ancestorsStack.length - 1; i >= 0; i--) {
        const { node, parentBlock, indexInParent } = ancestorsStack[i];
        if (node.type === "IfStatement" && isPoolMissGuard(node.test)) return true;
        if (parentBlock && parentBlock.type === "BlockStatement" && isEarlyContinueGuard(parentBlock, indexInParent)) {
            return true;
        }
        if (FN_TYPES.has(node.type)) break;
    }
    return false;
}

function* walkScope(rootBody, fnMap, visited, initialInLoop) {
    const startInLoop = initialInLoop === true;
    const stack = [{ node: rootBody, parentBlock: null, indexInParent: -1, inLoop: startInLoop, ancestors: [] }];
    while (stack.length > 0) {
        const { node, parentBlock, indexInParent, inLoop, ancestors } = stack.pop();
        if (!node || typeof node !== "object" || !node.type) continue;
        if (FN_TYPES.has(node.type)) continue;
        const nextAncestors = ancestors.concat({ node, parentBlock, indexInParent });
        yield { node, inLoop, ancestors: nextAncestors };
        if (
            node.type === "CallExpression" &&
            node.callee.type === "Identifier" &&
            fnMap.has(node.callee.name) &&
            !visited.has(node.callee.name)
        ) {
            visited.add(node.callee.name);
            const fnBody = fnMap.get(node.callee.name);
            yield* walkScope(fnBody, fnMap, visited, inLoop);
        }
        if (isArrayLoopMethodCall(node)) {
            for (const arg of node.arguments) {
                if (FN_TYPES.has(arg.type) && arg.body) {
                    yield* walkScope(arg.body, fnMap, visited, true);
                }
            }
        }
        const nextInLoop = inLoop || LOOP_TYPES.has(node.type);
        for (const key of Object.keys(node)) {
            if (key === "parent" || key === "loc" || key === "range" || key === "type") continue;
            const child = node[key];
            if (Array.isArray(child)) {
                for (let i = 0; i < child.length; i++) {
                    const c = child[i];
                    if (c && typeof c === "object" && c.type) {
                        stack.push({
                            node: c,
                            parentBlock: node,
                            indexInParent: i,
                            inLoop: nextInLoop,
                            ancestors: nextAncestors,
                        });
                    }
                }
            } else if (child && typeof child === "object" && child.type) {
                stack.push({
                    node: child,
                    parentBlock: node,
                    indexInParent: -1,
                    inLoop: nextInLoop,
                    ancestors: nextAncestors,
                });
            }
        }
    }
}

function collectFunctionMap(programNode) {
    const map = new Map();
    function walk(node) {
        if (!node || typeof node !== "object" || !node.type) return;
        if (node.type === "FunctionDeclaration" && node.id) map.set(node.id.name, node.body);
        if (
            node.type === "VariableDeclarator" &&
            node.id &&
            node.id.type === "Identifier" &&
            node.init &&
            (node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression")
        ) {
            map.set(node.id.name, node.init.body);
        }
        for (const key of Object.keys(node)) {
            if (key === "parent" || key === "loc" || key === "range" || key === "type") continue;
            const child = node[key];
            if (Array.isArray(child)) {
                for (const c of child) walk(c);
            } else if (child && typeof child === "object" && child.type) {
                walk(child);
            }
        }
    }
    walk(programNode);
    return map;
}

function buildRemediation(kind) {
    const base = `Replace with one of:
A. createLiveStore<Row>({...}) + liveView({mountRow, patchRow}) for keyed lists fed by delta streams. Precedent: main/dashboard/src/dom/clans/manage-tabs/audit/index.ts
B. Per-key Instance pool with patchRow + placeRows for snapshot-driven keyed lists. Precedent: main/dashboard/src/dom/clans/render-clan-map.ts (buildRowShell + patchRow + placeRows)
C. Stable refs built ONCE outside the effect with setText / setAttr / style.* patches inside. Precedent: main/dashboard/src/dom/clans/clan-map/names.ts (per-card refs + image pool diff)
D. Pass reactive props to factory primitives directly. \`image({ src: someSignal })\`, \`image({ src: () => computeSrc(state) })\`, \`paragraph({ text: someSignal })\` — the factory internally subscribes via writeAttr/writeText and mutates the persistent element on emit, no rebuild required. Precedent: main/dashboard/src/dom/factory/data-ops/rsn-tag.ts (manual in-place mutation; equivalent pattern); main/dashboard/src/dom/factory/content-ops/graphics/media.ts (image() accepts ReactiveValue<string> for src/alt/title).`;
    if (kind === "addChild-factory") {
        return `${base}
For per-key lazy mount, guard the build with "if (!pool.has(key))" (or "if (x === undefined)" / "if (x === null)") so the factory call only fires on cache-miss. See main/dashboard/src/dom/clans/clan-map/names.ts:syncPrayerImages.`;
    }
    return base;
}

function describeKind(kind) {
    switch (kind) {
        case "setChildren-spread":
            return "setChildren(...spread) — destructive replace of all children";
        case "setChildren-map":
            return "setChildren(...arr.map(...)) — destructive replace with newly-built children";
        case "setChildren-inline-factory":
            return "setChildren with an inline factory primitive arg — child is recreated each tick";
        case "clear-loop":
            return "clear() + addChild loop — destructive replace, dressed differently";
        case "addChild-factory":
            return "addChild(factoryPrimitive(...)) outside a pool-miss guard — child is recreated each tick";
        default:
            return kind;
    }
}

function reportPattern(context, raw, mod, node, kind) {
    const t = trace(node, raw, mod);
    const description = describeKind(kind);
    context.report({
        node,
        messageId: "report",
        data: {
            report: build4DReport({
                rule: "no-effect-rebuild",
                narrative: `Reactive effect (lexical or via named-function / array-method-callback indirection) rebuilds DOM children via ${description}. <img> elements re-decode their bitmaps on re-mount, causing visible flicker. The proper realtime infra (liveStore + liveView, per-key Instance pool, stable refs + patch, or reactive factory props) keeps elements stable across ticks and patches only what changed.`,
                graph: {
                    X: `${t.file}:${t.line} — ${kind} reachable from effect() in ${t.context}`,
                    Y: `the per-key Instance pool / liveStore / liveView / reactive-prop infra is bypassed — DOM elements (especially images) are recreated on every signal change rather than diff-patched in place`,
                    Z: `no_separation — child management lives in the effect scope (destructive rebuild) rather than via stable refs + patch-in-place`,
                    W: `every bypass causes flicker on every signal tick; image elements re-decode; hover state lost; nested effects in stable children are torn down + recreated unnecessarily`,
                },
                remediation: buildRemediation(kind),
                trace: t,
            }),
        },
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description: "Ban destroy-and-rebuild DOM patterns reachable from reactive effects (causes flicker on every signal tick).",
        },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).split("\\").join("/");
        const mod = getModuleForFile(raw);
        let fnMap = null;

        return {
            Program(node) {
                fnMap = collectFunctionMap(node);
            },
            CallExpression(node) {
                if (!isEffectCall(node)) return;
                const callback = node.arguments[0];
                if (!callback || (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression")) {
                    return;
                }
                const visited = new Set();
                let sawClear = false;
                for (const { node: inner, inLoop, ancestors } of walkScope(callback.body, fnMap || new Map(), visited, false)) {
                    if (inner.type !== "CallExpression") continue;
                    if (isSetChildrenSpread(inner)) {
                        const isMap =
                            inner.arguments[0] &&
                            inner.arguments[0].type === "SpreadElement" &&
                            inner.arguments[0].argument &&
                            inner.arguments[0].argument.type === "CallExpression" &&
                            inner.arguments[0].argument.callee.type === "MemberExpression" &&
                            inner.arguments[0].argument.callee.property &&
                            inner.arguments[0].argument.callee.property.name === "map";
                        reportPattern(context, raw, mod, inner, isMap ? "setChildren-map" : "setChildren-spread");
                        continue;
                    }
                    if (isSetChildrenWithInlineFactory(inner)) {
                        reportPattern(context, raw, mod, inner, "setChildren-inline-factory");
                        continue;
                    }
                    if (isMethodCall(inner, "clear")) {
                        sawClear = true;
                        continue;
                    }
                    if (isMethodCall(inner, "addChild") && sawClear && inLoop) {
                        reportPattern(context, raw, mod, inner, "clear-loop");
                        continue;
                    }
                    if (isAddChildOfFactory(inner) && !isGuardedByPoolMiss(ancestors)) {
                        reportPattern(context, raw, mod, inner, "addChild-factory");
                    }
                }
            },
        };
    },
};
