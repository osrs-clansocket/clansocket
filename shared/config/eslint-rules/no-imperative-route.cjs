/**
 * LVI/no-imperative-route — ban deepLink.navigate(...) calls outside the navigation chokepoints.
 *
 * Feature code must express navigation declaratively via <a href> (factory: a({attrs:{href:"/path"}}))
 * so the href is visible in the AI's pageState snapshot. The dom-state collector surfaces href on
 * any keyed element that IS an anchor, is wrapped in one, or contains one. AI sees the navigation
 * target → uses actions.route → executor's route-precedence enforcement runs cleanly.
 *
 * Imperative deepLink.navigate(...) in feature code creates an invisible navigation: AI cant see
 * the destination, cant predict the dom swap, cant use actions.route, and any sibling verbs hit
 * stale keys after the navigation fires.
 *
 * Exempt files (legitimate imperative-navigation consumers):
 *   src/managers/deep-link.ts        the manager's own implementation
 *   src/ai/action-executor.ts        the AI route verb dispatcher
 *
 * Everywhere else uses anchors. If a button needs to look like a button but navigate like a link,
 * add a linkButton({ to, variant, ... }) factory helper that builds <a class="btn">.
 *
 * Escape hatch (rare): precede the call with
 *   // eslint-disable-next-line lvi/no-imperative-route
 * Document WHY in a one-line comment above the directive. The no-comments cleaner preserves
 * eslint directives.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const NAVIGATE_PROP = "navigate";
const DEEP_LINK_RECEIVER = "deepLink";
const EXEMPT_PATH_SEGMENTS = [
    "/managers/deep-link.ts",
    "/ai/action-executor.ts",
];

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isExemptPath(normPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (normPath.endsWith(seg)) return true;
    }
    return false;
}

function isDeepLinkNavigateCall(node) {
    const callee = node.callee;
    if (!callee || callee.type !== "MemberExpression") return false;
    if (!callee.property || callee.property.name !== NAVIGATE_PROP) return false;
    const obj = callee.object;
    if (!obj) return false;
    if (obj.type === "Identifier" && obj.name === DEEP_LINK_RECEIVER) return true;
    if (obj.type === "MemberExpression" && obj.property && obj.property.name === DEEP_LINK_RECEIVER) return true;
    return false;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban imperative deepLink.navigate() in feature code; use <a href> anchors instead." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = normalizePath(context.filename || context.getFilename());
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);

        return {
            CallExpression(node) {
                if (!isDeepLinkNavigateCall(node)) return;
                const t = trace(node, raw, mod);
                context.report({
                    node,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "no-imperative-route",
                            narrative:
                                `Feature code called deepLink.navigate(...) imperatively. ` +
                                `Navigation must be declarative via <a href> so the AI's pageState snapshot ` +
                                `can surface the destination on the element. Imperative navigation is invisible ` +
                                `to the AI — it cant prefer actions.route, cant predict the dom swap, and any ` +
                                `verbs it bundles in the same turn will hit stale keys after the navigation fires.`,
                            graph: {
                                X: `${t.file}:${t.line} — imperative deepLink.navigate() in ${t.context}`,
                                Y: `the destination is hidden from the dom-state collector — no href surfaces, no route-precedence enforcement`,
                                Z: `no_separation — feature code holds navigation state separately from the dom contract that the AI reads`,
                                W: `AI emits click + sibling verbs against the element; the click navigates; siblings fire against stale keys; cascade of element-not-found feedback wastes turns`,
                            },
                            remediation:
                                `Replace deepLink.navigate("/path") with an anchor in the dom tree: ` +
                                `a({ attrs: { href: "/path" }, classes: ["btn"], onClick: handler }, [text]). ` +
                                `The href is visible in pageState; AI uses actions.route automatically. ` +
                                `If u need button styling, add a linkButton({ to: "/path", variant }) factory helper ` +
                                `that builds <a class="btn"> — extend src/dom/factory/, dont bypass it here.`,
                            trace: t,
                        }),
                    },
                });
            },
        };
    },
};
