/**
 * LVI/no-warning-comments — Bans TODO / FIXME / HACK / WORKAROUND / STOPSHIP / XXX in comments.
 * Word-boundary case-insensitive match. Replaces stock `no-warning-comments`.
 */
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

function isWordChar(c) {
    return (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "_";
}

function containsTerm(text, term) {
    const lower = text.toLowerCase();
    const pattern = term.toLowerCase();
    let i = 0;
    while ((i = lower.indexOf(pattern, i)) !== -1) {
        const before = i === 0 ? "" : lower[i - 1];
        const after = i + pattern.length >= lower.length ? "" : lower[i + pattern.length];
        if (!isWordChar(before) && !isWordChar(after)) return true;
        i += pattern.length;
    }
    return false;
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "No warning-marker comments (TODO/FIXME/HACK/etc.)" },
        schema: [{
            type: "object",
            properties: { terms: { type: "array", items: { type: "string" } } },
            additionalProperties: false,
        }],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const opts = context.options[0] || {};
        const terms = opts.terms || ["todo", "fixme", "hack", "workaround", "stopship", "xxx"];
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw) || "unknown";
        return {
            Program(node) {
                const comments = context.sourceCode.getAllComments();
                for (const c of comments) {
                    let matched = null;
                    for (const term of terms) {
                        if (containsTerm(c.value, term)) {
                            matched = term;
                            break;
                        }
                    }
                    if (matched === null) continue;
                    const t = trace(node, raw, mod);
                    t.line = String(c.loc.start.line);
                    t.col = String(c.loc.start.column);
                    context.report({ node: c, messageId: "report", data: { report: build4DReport({
                        rule: "no-warning-comments",
                        narrative: `Warning-marker comment "${matched.toUpperCase()}" at ${t.file}:${t.line}. Work-tracking belongs in clansocket-docs/ONGOING/, not in source.`,
                        graph: {
                            X: `marker "${matched}" inside comment`,
                            Y: `inline work-trackers rot — every grep skips them; CI ignores them; future-reader sees stale promises`,
                            Z: `work_tracking_externalized — source declares behavior, docs declare intent`,
                            W: `accumulated TODOs become an invisible backlog; nobody owns them`,
                        },
                        remediation: `Move the work item to an ONGOING handoff doc at \`clansocket-docs/ONGOING/ONGOING-<slug>.md\` and register it. Delete the comment.`,
                        trace: t,
                    }) } });
                }
            },
        };
    },
};
