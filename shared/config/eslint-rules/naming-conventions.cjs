/**
 * LVI/naming-conventions — Enforces kebab-case filenames + path-encoded shrinkage.
 * no_location: brittleness → semantic addressing (meaning-based reference).
 * Predictable naming = deterministic resolution. FOLDER = ROLE; filename
 * shrinks as path encodes more context (never prefix with what the path says).
 *
 * Shrinkage applies to ACTION prefixes only. Foundational/contract files in
 * folders like base/ / abstract/ / interface/ use IDENTIFIER prefixes that are
 * load-bearing and exempt from shrinkage — `base/base-registry.ts` is correct;
 * the `base-` prefix declares meta-type, it is not a path-encoded redundancy.
 */
const path = require("path");
const { getModuleForFile } = require("../resolve-paths.cjs");
const { build4DReport, trace } = require("./report-builder.cjs");

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const FOUNDATIONAL_IDENTIFIERS = new Set(["base", "abstract", "interface", "contract"]);

function pathTokenSet(raw) {
    const dir = path.dirname(raw);
    const segments = dir.split("/").filter(Boolean);
    const tokens = new Set();
    for (const seg of segments) {
        for (const t of seg.split("-")) tokens.add(t.toLowerCase());
    }
    return tokens;
}

function isIdentifierPrefixFile(raw, firstToken) {
    const lowerFirst = firstToken.toLowerCase();
    if (!FOUNDATIONAL_IDENTIFIERS.has(lowerFirst)) return false;
    const immediateParent = path.basename(path.dirname(raw)).toLowerCase();
    return immediateParent === lowerFirst;
}

function reportKebabViolation(context, node, raw, mod, filename, ext, base) {
    const suggestion =
        base
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            .replace(/[_\s]+/g, "-")
            .replace(/[^a-z0-9-]/gi, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase() + ext;
    const t = trace(node, raw, mod);
    context.report({
        node,
        messageId: "report",
        data: {
            report: build4DReport({
                rule: "naming-conventions",
                narrative: `Filename "${filename}" violates kebab-case convention. This codebase uses kebab-case for all source files — lowercase, hyphens only, no underscores, no spaces, no uppercase. Consistent naming enables deterministic file resolution.`,
                graph: {
                    X: `${t.file} — filename "${filename}" in [${mod}]`,
                    Y: `every import/require referencing this file uses the current name — rename propagates`,
                    Z: `no_location (SegregateByMeaning) — files addressed by convention, not arbitrary names`,
                    W: `case-sensitive filesystems will break imports if naming is inconsistent across environments`,
                },
                remediation: `Rename "${filename}" to "${suggestion}". Update all imports/requires referencing the old name. Run lint:fix to verify no broken references remain.`,
                trace: t,
            }),
        },
    });
}

function reportRedundancyViolation(context, node, raw, mod, filename, base, redundant, ext) {
    const remainingTokens = base.split("-").filter((tok) => !redundant.includes(tok));
    const suggestion = remainingTokens.join("-") + ext;
    const t = trace(node, raw, mod);
    context.report({
        node,
        messageId: "report",
        data: {
            report: build4DReport({
                rule: "naming-conventions",
                narrative: `Filename "${filename}" contains token(s) [${redundant.join(", ")}] that the parent path already encodes. FOLDER = ROLE; filename's action-prefix discriminates ONLY within the role-folder and shrinks as path encodes more context. Deep path means shorter filename — never prefix the filename with anything the path already says.`,
                graph: {
                    X: `${t.file} — redundant filename token(s): [${redundant.join(", ")}]`,
                    Y: `every import referencing this file uses the redundant name — rename propagates`,
                    Z: `path-encoded context — folder = role; filename's action-prefix discriminates ONLY within the role-folder`,
                    W: `redundant prefixes break the role-folder mental model; consumers read the filename instead of the path`,
                },
                remediation: `Rename "${filename}" to "${suggestion}". Drop the path-encoded token(s). Update all imports/requires referencing the old name.`,
                trace: t,
            }),
        },
    });
}

module.exports = {
    meta: {
        type: "problem",
        docs: { description: "Enforce kebab-case filenames + path-encoded shrinkage (no redundant prefix)" },
        schema: [],
        messages: { report: "{{ report }}" },
    },
    create(context) {
        const raw = (context.filename || context.getFilename()).replace(/\\/g, "/");
        const mod = getModuleForFile(raw);
        if (!mod) return {};
        return {
            Program(node) {
                const filename = path.basename(raw);
                const ext = path.extname(filename);
                const base = filename.slice(0, filename.length - ext.length);
                if (!KEBAB_RE.test(base)) {
                    reportKebabViolation(context, node, raw, mod, filename, ext, base);
                    return;
                }
                const segments = base.split("-");
                if (segments.length < 2) return;
                const actionTokens = segments.slice(0, -1);
                const pathTokens = pathTokenSet(raw);
                let redundant = actionTokens.filter((t) => pathTokens.has(t));
                if (isIdentifierPrefixFile(raw, segments[0])) {
                    redundant = redundant.filter((t) => t.toLowerCase() !== segments[0].toLowerCase());
                }
                if (redundant.length > 0) {
                    reportRedundancyViolation(context, node, raw, mod, filename, base, redundant, ext);
                }
            },
        };
    },
};
