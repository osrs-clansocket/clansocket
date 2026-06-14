"use strict";

/**
 * LVI/route-css-import — every route page module (file dynamically imported by a
 * *-route.ts file's `render:` field) under dom/pages/** must statically import its
 * per-route CSS at module scope. The import anchors the route's CSS to its dynamic
 * JS chunk, letting vite's `cssCodeSplit` emit a sibling .css chunk loaded only when
 * the route is visited. Without the static import, the route's CSS folds into the
 * eager entry bundle and the per-route split silently regresses to monolith.
 *
 * Detection: the rule scans <project>/main/dashboard/src/dom/**\/routes/*-route.ts files
 * at first invocation (cached), parses each for `render: async (...) => (await import("X"))`
 * patterns, and resolves X to its absolute .ts target. Files in that set are the page
 * modules.
 *
 * Scope: only fires on page modules located inside dom/pages/**. Page modules outside
 * that tree (auth flows, account at dom/clans/account/) are not subject to mirror-pages
 * and may legitimately render without per-route CSS.
 *
 * Reported shape: a page module in dom/pages/** with zero `.css` static imports at
 * module scope. Reports on Program node.
 */

const fs = require("fs");
const path = require("path");
const { getProjectRoot } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const DOM_ROOT_REL = "main/dashboard/src/dom";
const PAGES_MARKER = "/main/dashboard/src/dom/pages/";
const RENDER_FIELD_REGEX = /render\s*:\s*async\s*\([^)]*\)\s*=>\s*\(\s*await\s+import\s*\(\s*["']([^"']+)["']/g;

let _pageModulesCache = null;

function toPosix(p) {
    return p.split(path.sep).join("/");
}

function findRouteFiles(absDir, out) {
    let entries;
    try {
        entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const e of entries) {
        const full = path.join(absDir, e.name);
        if (e.isDirectory()) {
            findRouteFiles(full, out);
        } else if (e.isFile() && /-route\.ts$/.test(e.name)) {
            const norm = toPosix(full);
            if (/\/routes\/[^/]+-route\.ts$/.test(norm)) {
                out.push(full);
            }
        }
    }
}

function resolvePageModule(routeFileAbs, importStr) {
    const dir = path.dirname(routeFileAbs);
    const resolved = path.resolve(dir, importStr);
    if (resolved.endsWith(".js")) {
        const candidate = resolved.slice(0, -3) + ".ts";
        if (fs.existsSync(candidate)) return toPosix(candidate);
    }
    if (fs.existsSync(resolved + ".ts")) return toPosix(resolved + ".ts");
    const indexCandidate = path.join(resolved, "index.ts");
    if (fs.existsSync(indexCandidate)) return toPosix(indexCandidate);
    return null;
}

function buildPageModulesSet() {
    if (_pageModulesCache !== null) return _pageModulesCache;
    const root = getProjectRoot();
    const domRoot = path.resolve(root, DOM_ROOT_REL);
    const routeFiles = [];
    findRouteFiles(domRoot, routeFiles);
    const set = new Set();
    for (const routeFile of routeFiles) {
        let content;
        try {
            content = fs.readFileSync(routeFile, "utf8");
        } catch {
            continue;
        }
        RENDER_FIELD_REGEX.lastIndex = 0;
        let m;
        while ((m = RENDER_FIELD_REGEX.exec(content)) !== null) {
            const resolved = resolvePageModule(routeFile, m[1]);
            if (resolved !== null) set.add(resolved);
        }
    }
    _pageModulesCache = set;
    return set;
}

function isCssImport(specifier) {
    return typeof specifier === "string" && /\.css(\?.*)?$/.test(specifier);
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Route page modules under dom/pages/** (files dynamically imported by *-route.ts render fields) must statically import their per-route CSS subtree to anchor vite chunk-splitting.",
        },
        schema: [],
        messages: {
            report: "{{ report }}",
        },
    },
    create(context) {
        const rawPath = toPosix(context.filename || context.getFilename());
        if (!rawPath.includes(PAGES_MARKER)) return {};
        const set = buildPageModulesSet();
        if (!set.has(rawPath)) return {};
        let hasCssImport = false;
        return {
            ImportDeclaration(node) {
                if (isCssImport(node.source.value)) hasCssImport = true;
            },
            "Program:exit"(programNode) {
                if (hasCssImport) return;
                const t = trace(programNode, rawPath);
                context.report({
                    node: programNode,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "route-css-import",
                            narrative:
                                "Route page modules anchor per-route CSS chunks in the vite build. Without a static `import \"<*.css>\";` at module scope, the route's CSS folds into the eager entry bundle instead of splitting into a sibling chunk loaded only when this route is visited. The build still succeeds; the regression is silent and only visible as a re-bloated initial CSS payload.",
                            graph: {
                                X: `${t.file} — route page module with zero static CSS imports`,
                                Y: `vite cssCodeSplit splits CSS along JS chunk boundaries; this dynamically-imported chunk has no CSS anchor and forwards its styles to the eager entry`,
                                Z: `chunk_split — page module is dynamically imported but its CSS is not anchored to the dynamic chunk`,
                                W: `every page module that drops its CSS import re-bloats the eager bundle. on a multi-route SPA, a single regression can add 50-300KB to first-paint payload, invisible in CI metrics but visible in real-user load time`,
                            },
                            remediation:
                                "Add at least one `import \"<relative-path-to>/styles/pages/<family>/<route>-page.css\";` at the top of this file (side-effect import, before the JS imports). Multiple imports are fine if the route spans several CSS files (base + mobile companion, or cross-family styles).",
                            trace: t,
                        }),
                    },
                });
            },
        };
    },
};
