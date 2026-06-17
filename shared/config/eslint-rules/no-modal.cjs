/**
 * LVI/no-modal — ban modal dialogs on dashboard UI.
 *
 * Modal dialogs teleport the user's focus away from the action site (the cursor was
 * on the trigger; the modal puts attention at screen-center over a backdrop), force
 * a visual obstruction that hides surrounding context, and break the operator-console
 * workflow the dashboard is built for.
 *
 * Replacements (both centralized):
 *   slidePanel    — trigger-anchored slide-down panel for richer authoring tasks
 *                   (multi-step forms, code preview, passkey signup, etc.).
 *                   Trigger stays in place; panel slides down underneath.
 *                   Path: src/dom/factory/layout-ops/overlay/slide-panel.ts
 *   inlineConfirm — button-replacement confirmation for "are you sure?" prompts.
 *                   The host's children swap to [Cancel] [Confirm] in place;
 *                   cursor stays where it already was; no overlay; no scroll lock.
 *                   Path: src/dom/factory/layout-ops/inline/inline-confirm.ts
 *
 * Banned names (flagged at every import AND every call site):
 *   modal               — the overlay primitive (dom/factory/layout-ops/overlay/modal.ts)
 *   glassConfirm        — popup confirm dialog (dom/forms/glass/modals/glass-confirm.ts)
 *   promptPasskeySignup — passkey enrollment modal (dom/forms/glass/modals/glass-signup.ts)
 *   glassCodeView       — code-preview modal (dom/forms/glass/modals/glass-codeview.ts)
 *
 * Exempt source files (the to-be-deleted definitions themselves):
 *   src/dom/factory/layout-ops/overlay/modal.ts
 *   src/dom/forms/glass/modals/glass-confirm.ts
 *   src/dom/forms/glass/modals/glass-signup.ts
 *   src/dom/forms/glass/modals/glass-codeview.ts
 *
 * No escape hatch. The ban is absolute. DEV-RULES Design rule 27 mandates the new policy.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const BANNED_NAMES = new Set(["modal", "glassConfirm", "promptPasskeySignup", "glassCodeView"]);

const EXEMPT_PATH_SEGMENTS = [
    "/dom/factory/layout-ops/overlay/modal.ts",
    "/dom/forms/glass/modals/glass-confirm.ts",
    "/dom/forms/glass/modals/glass-signup.ts",
    "/dom/forms/glass/modals/glass-codeview.ts",
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

function buildReport(t, name) {
    return build4DReport({
        rule: "no-modal",
        narrative:
            `Feature code used \`${name}\`. Modal dialogs are banned on dashboard UI — ` +
            `they teleport focus away from the action site (cursor was on the trigger; the ` +
            `modal puts attention at screen-center over a backdrop), obstruct surrounding ` +
            `context, and break the operator-console workflow. Use slidePanel for richer ` +
            `authoring tasks or inlineConfirm for button-replacement confirmations.`,
        graph: {
            X: `${t.file}:${t.line} — \`${name}\` used in ${t.context}`,
            Y: `the click trigger sits somewhere on the page; the modal renders at ` +
                `screen-center over a backdrop; the user's mouse + focus + scroll position ` +
                `were all in a different place — the modal forces them to refocus`,
            Z: `architectural — modal dialogs are doctrinally banned per DEV-RULES Design ` +
                `rule 27; lvi/no-modal enforces the ban; the two centralized replacements ` +
                `(slidePanel + inlineConfirm) cover every confirm/form/preview shape`,
            W: `the migration: glassConfirm callsites → inlineConfirm(host, opts); ` +
                `glass-signup (passkey) + glass-codeview + multi-step glass-confirm flows → ` +
                `slidePanel triggered from the relevant button; the deleted source files no ` +
                `longer ship; future authors physically cannot author a new modal`,
        },
        remediation:
            `For confirmation prompts (\`glassConfirm({ message: "...", danger: true })\`): ` +
            `wrap the trigger button in a host div and call ` +
            `\`inlineConfirm(hostDiv, { danger, cancelContext, confirmContext })\` from ` +
            `the trigger's onClick. The host's children swap to [Cancel] [Confirm] in place. ` +
            `For richer flows (multi-step form / code preview / passkey enrollment): use ` +
            `\`slidePanel\` from the factory barrel — trigger stays in place, panel slides ` +
            `down underneath. inlineConfirm at dom/factory/layout-ops/inline/inline-confirm.ts; ` +
            `slidePanel at dom/factory/layout-ops/overlay/slide-panel.ts.`,
        trace: t,
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Ban modal dialogs on dashboard UI; mandate slidePanel + inlineConfirm." },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = normalizePath(context.filename || context.getFilename());
        if (isExemptPath(raw)) return {};
        const mod = getModuleForFile(raw);
        const localBindings = new Set();

        return {
            ImportDeclaration(node) {
                for (const spec of node.specifiers) {
                    if (spec.type !== "ImportSpecifier") continue;
                    if (!spec.imported || !BANNED_NAMES.has(spec.imported.name)) continue;
                    localBindings.add(spec.local.name);
                    const t = trace(spec, raw, mod);
                    context.report({
                        node: spec,
                        messageId: "report",
                        data: { report: buildReport(t, spec.imported.name) },
                    });
                }
            },
            CallExpression(node) {
                if (node.callee.type !== "Identifier") return;
                if (!localBindings.has(node.callee.name)) return;
                const t = trace(node, raw, mod);
                context.report({
                    node,
                    messageId: "report",
                    data: { report: buildReport(t, node.callee.name) },
                });
            },
        };
    },
};
