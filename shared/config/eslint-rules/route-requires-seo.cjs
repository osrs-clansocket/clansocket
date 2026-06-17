/**
 * LVI/route-requires-seo — every defineRoute({...}) must declare seo: { title, description }.
 *
 * The seo block drives three downstream surfaces:
 *   1. runtime <title> + <meta name="description"> + og:* / twitter:* updates at route change
 *      (applied by dom/factory/seo-ops/apply-seo.ts on every router.resolve())
 *   2. sitemap.xml generation (build-sitemap-script.ts walks routeDefs() and emits an entry
 *      per non-hidden, non-templated route)
 *   3. <meta name="robots"> noindex toggle for hidden routes
 *
 * Without seo, the route silently falls back to whatever <title>/<meta> are statically in
 * index.html — fine for the home page, wrong everywhere else (every share, every browser
 * tab, every search snippet looks like the home page).
 *
 * Scope: this rule visits `CallExpression(callee.name === "defineRoute")`. Variable-binding
 * reference walking is not supported — pass an object literal directly.
 *
 * Escape hatch: precede the call with
 *   // eslint-disable-next-line lvi/route-requires-seo
 * Document WHY above the directive. The no-comments cleaner preserves eslint directives.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const DEFINE_ROUTE = "defineRoute";
const SEO_KEY = "seo";
const TITLE_KEY = "title";
const DESCRIPTION_KEY = "description";

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isDefineRouteCall(node) {
    const callee = node.callee;
    return callee && callee.type === "Identifier" && callee.name === DEFINE_ROUTE;
}

function findProperty(objNode, name) {
    if (!objNode || objNode.type !== "ObjectExpression") return null;
    for (const p of objNode.properties) {
        if (p.type !== "Property") continue;
        if (!p.key) continue;
        if (p.key.type === "Identifier" && p.key.name === name) return p;
        if (p.key.type === "Literal" && p.key.value === name) return p;
    }
    return null;
}

function isNonEmptyStringLiteral(node) {
    return node && node.type === "Literal" && typeof node.value === "string" && node.value.length > 0;
}

function buildNarrative(what) {
    return (
        `defineRoute({...}) requires seo: { title, description } at minimum. ${what}. ` +
        `Without seo, the route can't drive document.title, meta description, social-share previews, or the sitemap generator.`
    );
}

function buildRemediation() {
    return (
        `Add a seo block to the defineRoute({...}) call: ` +
        `seo: { title: "Page Title", description: "One-sentence description.", hidden?: true }. ` +
        `Hidden routes (auth-walled, owner-only) still need title+description for direct-nav browser titles, ` +
        `but they get excluded from the sitemap.`
    );
}

function reportMissing(context, node, raw, mod, what) {
    const t = trace(node, raw, mod);
    context.report({
        node,
        messageId: "report",
        data: {
            report: build4DReport({
                rule: "route-requires-seo",
                narrative: buildNarrative(what),
                graph: {
                    X: `${t.file}:${t.line} — ${what}`,
                    Y: `route registers but carries no seo data — runtime applier has nothing to write to <title>/<meta>`,
                    Z: `no_unverified — every registered route must carry seo:{title,description} so the runtime applier and sitemap generator share one source of truth`,
                    W: `users see the stale home-page <title> on every other route; sitemap can't emit an entry; social-share preview lies about destination`,
                },
                remediation: buildRemediation(),
                trace: t,
            }),
        },
    });
}

function isResolverFn(node) {
    return node && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression");
}

function validateSeo(context, node, seoProp, raw, mod) {
    const seoVal = seoProp.value;
    if (isResolverFn(seoVal)) return;
    if (!seoVal || seoVal.type !== "ObjectExpression") {
        reportMissing(context, seoProp, raw, mod, "seo must be an object literal or a resolver function");
        return;
    }
    const titleProp = findProperty(seoVal, TITLE_KEY);
    if (titleProp === null || !isNonEmptyStringLiteral(titleProp.value)) {
        reportMissing(context, seoVal, raw, mod, "seo.title must be a non-empty string literal");
        return;
    }
    const descProp = findProperty(seoVal, DESCRIPTION_KEY);
    if (descProp === null || !isNonEmptyStringLiteral(descProp.value)) {
        reportMissing(context, seoVal, raw, mod, "seo.description must be a non-empty string literal");
        return;
    }
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Every defineRoute(...) must declare seo: { title, description } at minimum." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = normalizePath(context.filename || context.getFilename());
        const mod = getModuleForFile(raw);

        return {
            CallExpression(node) {
                if (!isDefineRouteCall(node)) return;
                const arg = node.arguments[0];
                if (!arg || arg.type !== "ObjectExpression") {
                    reportMissing(context, node, raw, mod, "defineRoute argument must be an object literal");
                    return;
                }
                const seoProp = findProperty(arg, SEO_KEY);
                if (seoProp === null) {
                    reportMissing(context, arg, raw, mod, "missing required seo field");
                    return;
                }
                validateSeo(context, node, seoProp, raw, mod);
            },
        };
    },
};
