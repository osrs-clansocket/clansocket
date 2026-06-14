"use strict";

/**
 * LVI/no-inline-classes — bans every string literal inline in factory classes: array
 * props. ALL class names are architectural identifiers and must reference a constant —
 * BEM-suffixed, utility (route-root), and state modifiers (is-active) alike. Single
 * source of truth per class name string.
 *
 * Rationale: every class name in classes: arrays is a contract with the CSS. Inlining
 * any of them creates DRY drift — a rename requires touching every call site. Extracting
 * each to a single constant in shared/constants/<domain>-constants.ts (or co-located
 * domain constants file) makes each class a single source of truth.
 *
 * Detection:
 *   classes: ["account__list"]              → flag
 *   classes: ["route-root"]                 → flag
 *   classes: ["is-active"]                  → flag (state modifiers count)
 *   classes: [ACCOUNT_LIST_CLASS]           → allowed (Identifier reference)
 *   classes: [ACCOUNT_LIST_CLASS, "extra"]  → mixed; the literal flags, identifier is fine
 *
 * Path exemptions:
 *   /dom/factory/**       — factory authors the primitives consuming class strings
 *   /shared/constants/**  — the canonical home for class constants (declarations live here)
 *   /styles/**            — CSS files, not in scope (rule runs on TS)
 */

const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const EXEMPT_PATH_SEGMENTS = [
    "/dom/factory/",
    "/shared/constants/",
];

function normalizePath(raw) {
    return raw.split("\\").join("/");
}

function isExemptPath(absPath) {
    for (const seg of EXEMPT_PATH_SEGMENTS) {
        if (absPath.includes(seg)) return true;
    }
    return false;
}

function isClassesProp(node) {
    if (node.type !== "Property") return false;
    if (!node.key) return false;
    if (node.key.type === "Identifier") return node.key.name === "classes";
    if (node.key.type === "Literal") return node.key.value === "classes";
    return false;
}

function isFlaggedLiteral(node) {
    if (!node || node.type !== "Literal") return false;
    return typeof node.value === "string";
}

module.exports = {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "BEM class strings (containing __ or --) must reference a constant — no inline literals in factory classes: arrays.",
        },
        schema: [],
        messages: {
            report: "{{ report }}",
        },
    },
    create(context) {
        const rawPath = normalizePath(context.filename || context.getFilename());
        if (isExemptPath(rawPath)) return {};

        return {
            Property(node) {
                if (!isClassesProp(node)) return;
                if (!node.value || node.value.type !== "ArrayExpression") return;
                for (const el of node.value.elements) {
                    if (!isFlaggedLiteral(el)) continue;
                    const t = trace(el, rawPath, getModuleForFile(rawPath));
                    context.report({
                        node: el,
                        messageId: "report",
                        data: {
                            report: build4DReport({
                                rule: "no-inline-classes",
                                narrative: `Class literal "${el.value}" appears inline in a classes: array. Every class string is an architectural identifier and must reference a constant — single source of truth per the architecture doc's DRY pattern.`,
                                graph: {
                                    X: `${t.file}:${t.line} — inline class literal "${el.value}"`,
                                    Y: `the class name lives at the call site instead of a central constant; future renames require touching every call site`,
                                    Z: `no_separation (single source of truth) — architectural identifier inlined instead of referenced`,
                                    W: `each inline literal is a future divergence risk; class renames will drift across the codebase until every site is found`,
                                },
                                remediation: `Extract to a constant in shared/constants/<domain>-constants.ts (or the existing constants file for the class's domain). Import + reference: classes: [MY_CLASS_CONST]. Every class string — BEM-named, utility (route-root), and state modifier (is-active) — needs a constant.`,
                                trace: t,
                            }),
                        },
                    });
                }
            },
        };
    },
};
