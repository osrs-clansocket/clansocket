"use strict";

/**
 * LVI/mirror-pages — dom/pages/** and styles/pages/** mirror folder-for-folder.
 *
 * The render tree (dom/pages) and the style tree (styles/pages) describe the same page
 * surfaces, so their folder structure must be identical: every dom page folder has a
 * styles twin at the mirrored path, and every styles page folder has a dom twin. Location
 * is then fully predictable — the css for what a module renders lives at the mirrored path
 * and nowhere else.
 *
 * Contract: folder-set equality. `set(dom/pages/** dirs) === set(styles/pages/** dirs)`.
 * Files inside a twinned folder are free (a folder may hold N render modules / N css files
 * that do not pair one-to-one); only the folder tree must match.
 *
 * Scope: only the `pages/` subtrees. Shared primitives — dom/{factory,forms,background},
 * styles/{components,tokens,globals,effects} — are not page surfaces and are not mirrored.
 *
 * Coverage:
 *   1. Per-file check — runs in both eslint passes (the dashboard TS block lints dom/**.ts;
 *      the CSS block lints styles/**.css). A dom file checks for its styles twin; a css file
 *      checks for its dom twin. One report per folder via lexicographically-first lintable
 *      sibling so N files in a folder don't each re-report.
 *   2. Global empty-folder check — the per-file check is blind to a folder that contains no
 *      `.ts`/`.css` files (it never triggers a representative). A dir-tree walk computed
 *      once per eslint run identifies folders missing on the other side whose subtree holds
 *      no lintable descendants, and reports each exactly once. Together with (1), this
 *      enforces folder-set equality even for empty folders that would otherwise drift silently.
 */

const fs = require("fs");
const path = require("path");
const { getProjectRoot } = require("../resolve-paths.cjs");

const DOM_PAGES_REL = "main/dashboard/src/dom/pages";
const STYLES_PAGES_REL = "main/dashboard/src/styles/pages";

function toPosix(p) {
    return p.split(path.sep).join("/");
}

function isDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
}

function isFolderRepresentative(absFile, ext) {
    const dir = path.dirname(absFile);
    let entries;
    try {
        entries = fs.readdirSync(dir);
    } catch {
        return true;
    }
    const base = path.basename(absFile);
    let first = null;
    for (const e of entries) {
        if (!e.endsWith(ext)) continue;
        if (first === null || e < first) first = e;
    }
    return first === null || first === base;
}

function relFolderAfter(posixFile, markerPosix) {
    const idx = posixFile.indexOf(markerPosix);
    if (idx < 0) return null;
    const after = posixFile.slice(idx + markerPosix.length);
    const rel = path.posix.dirname(after);
    return rel === "." ? "" : rel;
}

function walkDirsRel(absRoot) {
    const out = new Set();
    function recurse(dir, rel) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const e of entries) {
            if (!e.isDirectory()) continue;
            const subRel = rel === "" ? e.name : `${rel}/${e.name}`;
            out.add(subRel);
            recurse(path.join(dir, e.name), subRel);
        }
    }
    recurse(absRoot, "");
    return out;
}

function hasLintableDescendant(absDir, ext) {
    let entries;
    try {
        entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
        return false;
    }
    for (const e of entries) {
        if (e.isFile() && e.name.endsWith(ext)) return true;
        if (e.isDirectory() && hasLintableDescendant(path.join(absDir, e.name), ext)) return true;
    }
    return false;
}

let _dirCache = null;
const _reportedEmpty = new Set();

function getEmptyDriftCache(domPagesAbs, stylesPagesAbs) {
    if (_dirCache) return _dirCache;
    const domDirs = walkDirsRel(domPagesAbs);
    const stylesDirs = walkDirsRel(stylesPagesAbs);
    const missingFromStyles = [];
    const missingFromDom = [];
    for (const d of domDirs) {
        if (stylesDirs.has(d)) continue;
        if (hasLintableDescendant(path.join(domPagesAbs, d), ".ts")) continue;
        missingFromStyles.push(d);
    }
    for (const d of stylesDirs) {
        if (domDirs.has(d)) continue;
        if (hasLintableDescendant(path.join(stylesPagesAbs, d), ".css")) continue;
        missingFromDom.push(d);
    }
    _dirCache = { missingFromStyles, missingFromDom };
    return _dirCache;
}

module.exports = {
    meta: {
        type: "suggestion",
        docs: {
            description: "dom/pages/** and styles/pages/** must mirror folder-for-folder.",
        },
        schema: [],
        messages: {
            missingStylesTwin:
                "dom page folder `pages/{{rel}}` has no `styles/pages/{{rel}}` twin. dom/pages and styles/pages mirror folder-for-folder — add `styles/pages/{{rel}}/` for this surface, or move/rename so the trees match.",
            missingDomTwin:
                "styles page folder `pages/{{rel}}` has no `dom/pages/{{rel}}` twin. dom/pages and styles/pages mirror folder-for-folder — add `dom/pages/{{rel}}/` (the rendering that paints this scope), or move/rename so the trees match.",
        },
    },
    create(context) {
        const abs = toPosix(context.filename || context.getFilename());
        const root = toPosix(getProjectRoot());
        const domMark = `/${DOM_PAGES_REL}/`;
        const stylesMark = `/${STYLES_PAGES_REL}/`;
        const domPagesAbs = `${root}/${DOM_PAGES_REL}`;
        const stylesPagesAbs = `${root}/${STYLES_PAGES_REL}`;

        const isInDom = abs.includes(domMark);
        const isInStyles = abs.includes(stylesMark);
        if (!isInDom && !isInStyles) return {};

        function flushEmptyDriftOnce(node) {
            const cache = getEmptyDriftCache(domPagesAbs, stylesPagesAbs);
            for (const rel of cache.missingFromStyles) {
                const key = `missingStylesTwin:${rel}`;
                if (_reportedEmpty.has(key)) continue;
                _reportedEmpty.add(key);
                context.report({ node, messageId: "missingStylesTwin", data: { rel } });
            }
            for (const rel of cache.missingFromDom) {
                const key = `missingDomTwin:${rel}`;
                if (_reportedEmpty.has(key)) continue;
                _reportedEmpty.add(key);
                context.report({ node, messageId: "missingDomTwin", data: { rel } });
            }
        }

        if (isInDom) {
            return {
                Program(node) {
                    flushEmptyDriftOnce(node);
                    if (!isFolderRepresentative(abs, ".ts")) return;
                    const rel = relFolderAfter(abs, domMark);
                    if (rel === null) return;
                    if (isDir(path.posix.join(stylesPagesAbs, rel))) return;
                    context.report({ node, messageId: "missingStylesTwin", data: { rel } });
                },
            };
        }

        return {
            StyleSheet(node) {
                flushEmptyDriftOnce(node);
                if (!isFolderRepresentative(abs, ".css")) return;
                const rel = relFolderAfter(abs, stylesMark);
                if (rel === null) return;
                if (isDir(path.posix.join(domPagesAbs, rel))) return;
                context.report({ node, messageId: "missingDomTwin", data: { rel } });
            },
        };
    },
};
