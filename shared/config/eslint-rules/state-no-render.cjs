"use strict";

/**
 * LVI/state-no-render — state/** is the data layer. It must not import render primitives
 * from dom/factory.
 *
 * Allowed factory subpath imports from state/**:
 *   dom/factory/reactive      — signals, derived, effect, snapshot
 *   dom/factory/scheduler     — frame queue
 *   dom/factory/live-ops      — createLiveStore, LiveSource, LiveStore, LiveChange types
 *   dom/factory/core          — Instance type + foundational primitives (NO render fn calls)
 *
 * Banned from state/**:
 *   dom/factory/index         — the barrel re-exports everything including render primitives;
 *                               importing from it hides whether the dependency is render or
 *                               not. Force subpath imports so the layer is explicit at the
 *                               import line.
 *   dom/factory/layout-ops    — div, section, header, footer, nav, grid, etc.
 *   dom/factory/content-ops   — span, button, heading, anchor, icon, image, label, input, form
 *   dom/factory/data-ops      — rsnTag, clanAvatar, dataTable, clanMap, etc.
 *
 * Rationale: data should not paint. If state needs to emit a rendered surface, expose the
 * data (URL, blob, signal) and let a dom/ caller wrap it in render primitives. Mixed-concern
 * state modules can't be reused across surfaces and magnify blast radius when render shape
 * changes.
 */

const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const STATE_MARKER = "/main/dashboard/src/state/";

const FACTORY_BARREL_SUFFIXES = ["/dom/factory", "/dom/factory/index", "/dom/factory/index.js"];
const FACTORY_RENDER_SUBPATHS = [
    "/dom/factory/layout-ops",
    "/dom/factory/content-ops",
    "/dom/factory/data-ops",
];

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isStateFile(absPath) {
    return absPath.includes(STATE_MARKER);
}

function importIsFactoryBarrel(specifier) {
    if (typeof specifier !== "string") return false;
    for (const suffix of FACTORY_BARREL_SUFFIXES) {
        if (specifier.endsWith(suffix)) return true;
    }
    return false;
}

function importIsFactoryRender(specifier) {
    if (typeof specifier !== "string") return false;
    for (const sub of FACTORY_RENDER_SUBPATHS) {
        if (specifier.includes(sub)) return true;
    }
    return false;
}

module.exports = {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "state/** must not import render primitives from dom/factory. Allowed subpaths: reactive, scheduler, live-ops, core (types). Banned: layout-ops, content-ops, data-ops, factory barrel.",
        },
        schema: [],
        messages: {
            barrel: "{{ report }}",
            render: "{{ report }}",
        },
    },
    create(context) {
        const rawPath = normalizePath(context.filename || context.getFilename());
        if (!isStateFile(rawPath)) return {};

        return {
            ImportDeclaration(node) {
                const spec = node.source.value;

                if (importIsFactoryBarrel(spec)) {
                    const t = trace(node, rawPath, getModuleForFile(rawPath));
                    context.report({
                        node,
                        messageId: "barrel",
                        data: {
                            report: build4DReport({
                                rule: "state-no-render",
                                narrative:
                                    "state/** file imports the dom/factory barrel directly. The barrel re-exports every factory subsystem including render primitives (div, button, span, anchor, …) — one import line can pull a render dependency into the data layer invisibly. State should only depend on the reactive + live-store + scheduler subsystems, and the explicit subpath import documents that.",
                                graph: {
                                    X: `${t.file}:${t.line} — import from "${spec}" (factory barrel) inside state/`,
                                    Y: `the barrel mixes render + reactive + live-store + scheduler exports; the lint can't tell from the import line which subsystem you actually need`,
                                    Z: `no_separation — data layer reaches for the render barrel`,
                                    W: `barrel imports become trojan-horses for layer violations; later edits can add a render call without changing the import line, and lint won't notice`,
                                },
                                remediation:
                                    'Import from a specific subpath that documents intent: dom/factory/reactive (signals, derived, effect, snapshot), dom/factory/scheduler (frame queue), dom/factory/live-ops (live store / live source types), dom/factory/core (types). If you need a render primitive, that\'s the violation — the rendering belongs in dom/<surface>/, not here. Expose the data and let a render-layer caller paint it.',
                                trace: t,
                            }),
                        },
                    });
                    return;
                }

                if (importIsFactoryRender(spec)) {
                    const t = trace(node, rawPath, getModuleForFile(rawPath));
                    context.report({
                        node,
                        messageId: "render",
                        data: {
                            report: build4DReport({
                                rule: "state-no-render",
                                narrative: `state/** file imports from a render-layer factory subpath ("${spec}"). Render primitives (layout-ops, content-ops, data-ops) build DOM; they don't belong in the data layer.`,
                                graph: {
                                    X: `${t.file}:${t.line} — render-layer factory import "${spec}" inside state/`,
                                    Y: `state writes DOM directly here, bypassing the dom/ → state/ data-flow contract (dom reads from state, state never paints)`,
                                    Z: `no_separation — data layer renders`,
                                    W: `mixed-concern state modules can't be reused across surfaces (coupled to a specific render shape); a future refactor of the render side requires touching state, magnifying blast radius`,
                                },
                                remediation:
                                    "Pull the rendering out to a dom/<surface>/ caller. The state file should expose data (URL string, blob, signal); the caller wraps it in the render primitive. If the render call is genuinely the right place for it, the file itself belongs under dom/, not state/.",
                                trace: t,
                            }),
                        },
                    });
                }
            },
        };
    },
};
