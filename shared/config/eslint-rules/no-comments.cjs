/**
 * LVI/no-comments — Auto-removes all comments on fix.
 * Zero tolerance. Code is self-documenting or it isn't code.
 * no_uncompressed: pattern without compression → comments are uncompressed intent that belongs in naming.
 *
 * Catches: line (//), block, JSDoc, inline, multi-line, type annotations.
 * Preserves: eslint directives (eslint-disable, eslint-enable) — these are functional, not documentation.
 * Preserves: shebangs (#!/usr/bin/env) — these are runtime directives.
 */

const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, shortFile } = require("./report-builder.cjs");

function isDirective(value) {
    const trimmed = value.trimStart();
    return trimmed.startsWith("eslint-disable") ||
           trimmed.startsWith("eslint-enable") ||
           trimmed.startsWith("eslint-env") ||
           trimmed.startsWith("global ") ||
           trimmed.startsWith("globals ") ||
           trimmed.startsWith("@ts-") ||
           trimmed.startsWith("!") ||
           trimmed.startsWith("c8");
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Remove all comments — code is self-documenting" },
        fixable: "code",
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw);
        const file = shortFile(raw);
        const src = context.sourceCode || context.getSourceCode();

        return {
            Program() {
                const comments = src.getAllComments();
                for (const comment of comments) {
                    if (isDirective(comment.value)) { continue; }

                    const preview = comment.value.trim().slice(0, 60).replace(/\n/g, " ");

                    context.report({
                        loc: comment.loc,
                        messageId: "report",
                        data: {
                            report: build4DReport({
                                rule: "no-comments",
                                narrative: `Comment "${preview}..." found. This codebase mandates zero comments. If intent isn't clear from naming and structure, the code needs refactoring — not annotation. Comments are uncompressed intent that drifts from the code it describes.`,
                                graph: {
                                    X: `${file}:${comment.loc.start.line} — ${comment.type} comment`,
                                    Y: `nothing depends on this comment — it has zero consumers, zero enforcement, zero validation`,
                                    Z: `no_uncompressed (CompressToSimplest) — intent must live in names and structure, not prose`,
                                    W: `comments drift — the code changes, the comment stays, now it lies`,
                                },
                                remediation: `Delete the comment at ${file}:${comment.loc.start.line}. If the code isn't clear without it, rename the variable/function/module to express the intent directly. Auto-fix will remove it.`,
                                trace: { file, line: String(comment.loc.start.line), col: String(comment.loc.start.column), context: "comment", module: mod || "unknown", related: [] },
                            }),
                        },
                        fix(fixer) {
                            const start = comment.range[0];
                            let end = comment.range[1];
                            const text = src.getText();
                            if (end < text.length && text.charCodeAt(end) === 10) { end++; }
                            const before = start > 0 ? text.slice(0, start) : "";
                            const lineStart = before.lastIndexOf("\n") + 1;
                            const prefix = text.slice(lineStart, start);
                            if (prefix.trim().length === 0) {
                                return fixer.removeRange([lineStart === 0 ? 0 : lineStart, end]);
                            }
                            const trimEnd = start;
                            let trimStart = trimEnd;
                            while (trimStart > lineStart && text.charCodeAt(trimStart - 1) === 32) { trimStart--; }
                            return fixer.removeRange([trimStart, end]);
                        },
                    });
                }
            },
        };
    },
};
