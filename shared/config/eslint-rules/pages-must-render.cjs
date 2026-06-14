"use strict";

/**
 * LVI/pages-must-render — every TS file under dom/pages/** is the visual surface for a
 * page; it must import from dom/factory (any subpath) or it isn't rendering. Files with
 * runtime exports but zero factory imports are misplaced data/state/format/persistence
 * code that belongs in state/ or another non-visual layer.
 *
 * The rule complements mirror-pages: dom/pages/** ↔ styles/pages/** folder-set equality
 * already constrains the TREE, but says nothing about whether a TS file in that tree is
 * actually visual. This rule closes the gap.
 *
 * Permitted shapes:
 *   - any file that imports from dom/factory (its variants/subpaths), regardless of how
 *     much non-render code it also contains. Render-using files are page surface.
 *   - pure type-only files (no FunctionDeclaration / VariableDeclaration with init /
 *     ClassDeclaration). Types-only modules are exempt because they describe shape, not
 *     behavior.
 *
 * Reported shape: any dom/pages/** file with at least one runtime export and zero factory
 * imports.
 */

const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const PAGES_MARKER = "/main/dashboard/src/dom/pages/";
const FACTORY_SUBSTRING = "/factory";

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isPagesFile(absPath) {
    return absPath.includes(PAGES_MARKER);
}

function importIsFactory(specifier) {
    return typeof specifier === "string" && specifier.includes(FACTORY_SUBSTRING);
}

function declarationHasRuntime(decl) {
    if (!decl) return false;
    if (decl.type === "FunctionDeclaration") return true;
    if (decl.type === "ClassDeclaration") return true;
    if (decl.type === "VariableDeclaration") {
        return decl.declarations.some((d) => d.init !== null && d.init !== undefined);
    }
    return false;
}

module.exports = {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Files in dom/pages/** must import from dom/factory (or be types-only). Non-rendering code belongs outside the visual layer.",
        },
        schema: [],
        messages: {
            report: "{{ report }}",
        },
    },
    create(context) {
        const rawPath = normalizePath(context.filename || context.getFilename());
        if (!isPagesFile(rawPath)) return {};

        let importsFactory = false;
        let firstRuntimeNode = null;

        return {
            ImportDeclaration(node) {
                if (importIsFactory(node.source.value)) importsFactory = true;
            },
            ExportNamedDeclaration(node) {
                if (firstRuntimeNode) return;
                if (declarationHasRuntime(node.declaration)) firstRuntimeNode = node;
            },
            ExportDefaultDeclaration(node) {
                if (!firstRuntimeNode) firstRuntimeNode = node;
            },
            "Program:exit"(programNode) {
                if (importsFactory) return;
                if (!firstRuntimeNode) return;
                const t = trace(firstRuntimeNode, rawPath, getModuleForFile(rawPath));
                context.report({
                    node: firstRuntimeNode,
                    messageId: "report",
                    data: {
                        report: build4DReport({
                            rule: "pages-must-render",
                            narrative:
                                "dom/pages/** is the visual surface. This file has runtime exports but doesn't import from dom/factory — it isn't rendering anything. Non-visual code (state, formatters, persistence, data sources, type-bearing constants) belongs outside dom/pages/.",
                            graph: {
                                X: `${t.file}:${t.line} — runtime exports without factory imports in dom/pages/`,
                                Y: `the visual layer hosts a non-rendering module, eroding the dom/pages = visual contract`,
                                Z: `no_separation — page-folder hosts logic whose responsibility is data/state/format/persistence`,
                                W: `every misplaced file proliferates the wrong mental model: "dom/pages/ is where I put anything related to this page," letting the visual-only contract drift over time`,
                            },
                            remediation:
                                "Move runtime code that isn't render to its rightful layer: pure data → state/<scope>/, persistence helpers → state/<scope>/ or state/persistence/, formatters → state/<scope>/format.ts, route registrations → dom/<surface>/routes/. Keep dom/pages/ for the components that paint the page. A file that's only types is exempt; a file that delegates via one mount call to a render function is acceptable as a page-entry facade as long as the delegated callee imports the factory.",
                            trace: t,
                        }),
                    },
                });
            },
        };
    },
};
