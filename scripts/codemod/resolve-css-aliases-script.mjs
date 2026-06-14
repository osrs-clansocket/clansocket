#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as cssTree from "css-tree";
import { parse as parseTs } from "@typescript-eslint/typescript-estree";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..", "..");
const STYLES_ROOT = path.join(APP_ROOT, "main", "dashboard", "src", "styles");
const TS_ROOTS = [
    path.join(APP_ROOT, "main", "dashboard", "src"),
    path.join(APP_ROOT, "main", "server", "src"),
];
const REPORTS_DIR = path.join(APP_ROOT, ".lint-reports");
const REPORT_PATH = path.join(REPORTS_DIR, "resolve-css-aliases-dryrun.json");
const BACKUPS_DIR = path.join(APP_ROOT, ".script-backups");

const ARGS = process.argv.slice(2);
const DRY = ARGS.includes("--dry");
const REROLL_IDX = ARGS.indexOf("--reroll");
const REROLL_TARGET = REROLL_IDX !== -1 ? ARGS[REROLL_IDX + 1] : null;

// ─── path helpers ────────────────────────────────────────────────────────────

function toPosixPath(p) {
    return p.split(path.sep).join("/");
}
function relTo(file, root) {
    return toPosixPath(path.relative(root, file));
}
function isCssExempt(rel) {
    if (rel.startsWith("auto-gen/")) return true;
    if (rel.startsWith("icons/")) return true;
    if (rel === "icons.css" || rel === "prism.css") return true;
    if (rel.endsWith("/index.css") || rel === "index.css") return true;
    return false;
}

// ─── char-class predicates (no regex per rule 7) ─────────────────────────────

function isHWs(c) {
    return c === " " || c === "\t";
}

// ─── filesystem walk ─────────────────────────────────────────────────────────

function walkFiles(rootDir, extSet) {
    const out = [];
    function go(dir) {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.isSymbolicLink()) continue;
            const p = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (e.name === "node_modules" || e.name === ".lint-reports" || e.name === "dist" || e.name === ".script-backups" || e.name === ".git" || e.name === ".vscode" || e.name === ".cache") continue;
                go(p);
                continue;
            }
            if (!e.isFile()) continue;
            const ext = path.extname(e.name).toLowerCase();
            if (extSet.has(ext)) out.push(p);
        }
    }
    go(rootDir);
    return out;
}

// ─── css-tree helpers ────────────────────────────────────────────────────────

function childrenArray(listLike) {
    if (!listLike) return [];
    if (Array.isArray(listLike)) return listLike;
    if (typeof listLike.toArray === "function") return listLike.toArray();
    return [...listLike];
}

function parseCss(text) {
    try {
        return cssTree.parse(text, { positions: true, parseCustomProperty: true });
    } catch {
        return null;
    }
}

function parseCssValue(text) {
    try {
        return cssTree.parse(text, { context: "value", positions: true, parseCustomProperty: true });
    } catch {
        return null;
    }
}

// ─── alias map (transitive) ──────────────────────────────────────────────────

function isTopLevelRootRule(rule) {
    const sels = childrenArray(rule.prelude && rule.prelude.children);
    if (sels.length !== 1) return false;
    const selKids = childrenArray(sels[0].children);
    if (selKids.length !== 1) return false;
    return selKids[0].type === "PseudoClassSelector" && selKids[0].name === "root";
}

function isVarFunction(node) {
    return node && node.type === "Function" && typeof node.name === "string" && node.name.toLowerCase() === "var";
}

function isStrictSingleVarAliasDecl(decl) {
    if (decl.type !== "Declaration") return null;
    if (!decl.property || !decl.property.startsWith("--")) return null;
    if (decl.important) return null;
    const valKids = childrenArray(decl.value && decl.value.children);
    if (valKids.length !== 1) return null;
    const fn = valKids[0];
    if (!isVarFunction(fn)) return null;
    const args = childrenArray(fn.children);
    if (args.length !== 1) return null;
    const id = args[0];
    if (!id || id.type !== "Identifier" || !id.name || !id.name.startsWith("--")) return null;
    return { prop: decl.property, target: id.name };
}

function forEachTopLevelRootDecl(ast, callback) {
    const rootKids = childrenArray(ast.children);
    for (const child of rootKids) {
        if (child.type !== "Rule") continue;
        if (!isTopLevelRootRule(child)) continue;
        const blockKids = childrenArray(child.block && child.block.children);
        for (const decl of blockKids) {
            callback(decl);
        }
    }
}

function hasConditionalOverrideOfProp(ast, propName) {
    let conditional = false;
    cssTree.walk(ast, (node) => {
        if (conditional) return;
        if (node.type !== "Declaration") return;
        if (node.property !== propName) return;
        let p = node;
        let depth = 0;
        while (p && depth < 20) {
            if (p === ast) return;
            const parent = findParent(ast, p);
            if (!parent) return;
            if (parent.type === "Atrule") {
                conditional = true;
                return;
            }
            if (parent.type === "Rule") {
                if (!isTopLevelRootRule(parent)) {
                    conditional = true;
                    return;
                }
                p = parent;
            } else {
                p = parent;
            }
            depth += 1;
        }
    });
    return conditional;
}

function findParent(root, target) {
    let foundParent = null;
    function walk(node, parent) {
        if (foundParent) return;
        if (node === target) {
            foundParent = parent;
            return;
        }
        const kids = childrenArray(node.children);
        for (const k of kids) walk(k, node);
        if (node.block) walk(node.block, node);
        if (node.prelude) walk(node.prelude, node);
        if (node.value) walk(node.value, node);
    }
    walk(root, null);
    return foundParent;
}

function buildAliasMap(cssFiles) {
    const oneHop = new Map();
    const declSources = new Map();
    const ambiguousProps = new Set();
    const propsWithNonTopLevel = new Set();
    const fileAsts = new Map();

    for (const file of cssFiles) {
        const rel = relTo(file, STYLES_ROOT);
        if (isCssExempt(rel)) continue;
        const text = fs.readFileSync(file, "utf8");
        const ast = parseCss(text);
        if (!ast) continue;
        fileAsts.set(file, { ast, rel });

        forEachTopLevelRootDecl(ast, (decl) => {
            const alias = isStrictSingleVarAliasDecl(decl);
            if (!alias) return;
            if (oneHop.has(alias.prop) && oneHop.get(alias.prop) !== alias.target) {
                ambiguousProps.add(alias.prop);
            }
            oneHop.set(alias.prop, alias.target);
            if (!declSources.has(alias.prop)) declSources.set(alias.prop, []);
            declSources.get(alias.prop).push({
                file: rel,
                line: decl.loc && decl.loc.start ? decl.loc.start.line : 0,
            });
        });
    }

    for (const { ast } of fileAsts.values()) {
        const rootKids = childrenArray(ast.children);
        for (const child of rootKids) {
            if (child.type === "Rule" && isTopLevelRootRule(child)) continue;
            cssTree.walk(child, (inner) => {
                if (inner.type !== "Declaration") return;
                if (inner.property && oneHop.has(inner.property)) {
                    propsWithNonTopLevel.add(inner.property);
                }
            });
        }
    }

    for (const prop of ambiguousProps) {
        oneHop.delete(prop);
        declSources.delete(prop);
    }
    for (const prop of propsWithNonTopLevel) {
        oneHop.delete(prop);
        declSources.delete(prop);
    }

    const resolved = new Map();
    for (const src of oneHop.keys()) {
        const visited = new Set();
        let cur = src;
        while (oneHop.has(cur) && !visited.has(cur)) {
            visited.add(cur);
            cur = oneHop.get(cur);
        }
        resolved.set(src, cur);
    }
    return {
        resolved,
        declSources,
        skippedAmbiguous: [...ambiguousProps],
        skippedNonTopLevel: [...propsWithNonTopLevel],
    };
}

// ─── edit collection (per-file, atomic) ──────────────────────────────────────

function collectCssEditsForFile(text, aliasMap) {
    const ast = parseCss(text);
    if (!ast) return { edits: [], parseError: true };
    const declRemovals = [];
    const useRewrites = [];

    forEachTopLevelRootDecl(ast, (decl) => {
        const alias = isStrictSingleVarAliasDecl(decl);
        if (!alias) return;
        if (!aliasMap.has(alias.prop)) return;
        const r = computeDeclRemovalRange(text, decl);
        declRemovals.push({
            kind: "decl-removal",
            start: r.start,
            end: r.end,
            to: "",
            line: decl.loc.start.line,
            col: decl.loc.start.column,
            prop: alias.prop,
            target: aliasMap.get(alias.prop),
        });
    });

    cssTree.walk(ast, (node) => {
        if (isVarFunction(node)) {
            const args = childrenArray(node.children);
            const id = args[0];
            if (id && id.type === "Identifier" && id.name && aliasMap.has(id.name)) {
                const resolved = aliasMap.get(id.name);
                if (resolved !== id.name && id.loc && id.loc.start && id.loc.end) {
                    useRewrites.push({
                        kind: "var-use-rewrite",
                        start: id.loc.start.offset,
                        end: id.loc.end.offset,
                        to: resolved,
                        line: id.loc.start.line,
                        col: id.loc.start.column,
                        from: id.name,
                    });
                }
            }
        }
    });
    const filteredUseRewrites = useRewrites.filter((u) =>
        !declRemovals.some((r) => u.start >= r.start && u.end <= r.end),
    );
    const merged = mergeAndValidate([...declRemovals, ...filteredUseRewrites]);
    return { edits: merged, parseError: false, declRemovalCount: declRemovals.length, useRewriteCount: filteredUseRewrites.length };
}

function computeDeclRemovalRange(text, node) {
    let start = node.loc.start.offset;
    let end = node.loc.end.offset;
    if (text[end] === ";") end += 1;
    while (end < text.length && isHWs(text[end])) end += 1;
    if (text[end] === "\n") end += 1;
    while (start > 0 && isHWs(text[start - 1])) start -= 1;
    return { start, end };
}

function mergeAndValidate(edits) {
    const sorted = edits.slice().sort((a, b) => a.start - b.start || a.end - b.end);
    for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i].start < sorted[i - 1].end) {
            throw new Error(
                `overlapping edits detected: [${sorted[i - 1].start},${sorted[i - 1].end}) kind=${sorted[i - 1].kind} and [${sorted[i].start},${sorted[i].end}) kind=${sorted[i].kind}`,
            );
        }
    }
    return sorted;
}

function applyTextEdits(text, edits) {
    let result = text;
    for (let i = edits.length - 1; i >= 0; i -= 1) {
        const e = edits[i];
        result = result.slice(0, e.start) + (e.to !== undefined ? e.to : "") + result.slice(e.end);
    }
    return result;
}

// ─── JS string edits (token-based via cssTree.tokenize) ──────────────────────

function findCustomPropTokensInString(stringContent) {
    const out = [];
    try {
        cssTree.tokenize(stringContent, (_type, start, end) => {
            const tokenText = stringContent.slice(start, end);
            if (tokenText.length >= 3 && tokenText[0] === "-" && tokenText[1] === "-") {
                out.push({ start, end, name: tokenText });
            }
        });
    } catch {
        return [];
    }
    return out;
}

function collectJsEditsForFile(text, aliasMap) {
    const edits = [];
    let ast;
    try {
        ast = parseTs(text, { loc: true, range: true, jsx: true });
    } catch {
        return { edits: [], parseError: true };
    }

    function pushFromString(stringContent, contentStart) {
        if (!stringContent) return;
        const tokens = findCustomPropTokensInString(stringContent);
        for (const tok of tokens) {
            if (!aliasMap.has(tok.name)) continue;
            const resolved = aliasMap.get(tok.name);
            if (resolved === tok.name) continue;
            edits.push({
                kind: "js-string-rewrite",
                start: contentStart + tok.start,
                end: contentStart + tok.end,
                to: resolved,
                from: tok.name,
            });
        }
    }

    function visit(node) {
        if (!node || typeof node !== "object") return;
        if (node.type === "Literal" && typeof node.value === "string" && node.range) {
            const raw = text.slice(node.range[0], node.range[1]);
            const quote = raw[0];
            if (quote === '"' || quote === "'") {
                pushFromString(node.value, node.range[0] + 1);
            }
        } else if (node.type === "TemplateElement" && node.range && node.value && typeof node.value.cooked === "string") {
            pushFromString(node.value.cooked, node.range[0]);
        }
        for (const key of Object.keys(node)) {
            if (key === "parent" || key === "loc" || key === "range") continue;
            const v = node[key];
            if (Array.isArray(v)) {
                for (const item of v) visit(item);
            } else if (v && typeof v === "object" && typeof v.type === "string") {
                visit(v);
            }
        }
    }
    visit(ast);

    const merged = mergeAndValidate(edits);
    for (const e of merged) {
        const lc = offsetToLineCol(text, e.start);
        e.line = lc.line;
        e.col = lc.col;
    }
    return { edits: merged, parseError: false };
}

function offsetToLineCol(text, offset) {
    let line = 1;
    let col = 1;
    for (let i = 0; i < offset && i < text.length; i += 1) {
        if (text[i] === "\n") {
            line += 1;
            col = 1;
        } else {
            col += 1;
        }
    }
    return { line, col };
}

// ─── post-process: prune empty :root + verify AST validity ───────────────────

function pruneEmptyRootBlocks(text) {
    const ast = parseCss(text);
    if (!ast) return text;
    const edits = [];
    cssTree.walk(ast, (node) => {
        if (node.type !== "Rule") return;
        const sels = childrenArray(node.prelude && node.prelude.children);
        if (sels.length !== 1) return;
        const selKids = childrenArray(sels[0].children);
        if (selKids.length !== 1) return;
        if (selKids[0].type !== "PseudoClassSelector" || selKids[0].name !== "root") return;
        const blockKids = childrenArray(node.block && node.block.children);
        if (blockKids.some((k) => k.type === "Declaration")) return;
        const start = node.loc.start.offset;
        let end = node.loc.end.offset;
        while (end < text.length && (text[end] === " " || text[end] === "\t" || text[end] === "\n" || text[end] === "\r")) end += 1;
        edits.push({ kind: "empty-root-prune", start, end, to: "" });
    });
    if (edits.length === 0) return text;
    const merged = mergeAndValidate(edits);
    return applyTextEdits(text, merged);
}

function verifyCssValid(text) {
    const ast = parseCss(text);
    return ast !== null;
}

function verifyJsValid(text) {
    try {
        parseTs(text, { loc: false, range: false, jsx: true });
        return true;
    } catch {
        return false;
    }
}

function writeAtomicVerified(filePath, content, kind) {
    const tmpPath = filePath + ".tmp";
    try {
        fs.writeFileSync(tmpPath, content, "utf8");
    } catch (err) {
        return { ok: false, error: `tmp write failed: ${err.message}` };
    }
    let onDisk;
    try {
        onDisk = fs.readFileSync(tmpPath, "utf8");
    } catch (err) {
        try { fs.rmSync(tmpPath); } catch { /* ignore */ }
        return { ok: false, error: `tmp readback failed: ${err.message}` };
    }
    let valid;
    if (kind === "css") valid = verifyCssValid(onDisk);
    else if (kind === "js") valid = verifyJsValid(onDisk);
    else valid = true;
    if (!valid) {
        try { fs.rmSync(tmpPath); } catch { /* ignore */ }
        return { ok: false, error: `syntax verify failed (${kind})` };
    }
    try {
        fs.renameSync(tmpPath, filePath);
    } catch (err) {
        try { fs.rmSync(tmpPath); } catch { /* ignore */ }
        return { ok: false, error: `rename failed: ${err.message}` };
    }
    return { ok: true };
}

function isCssFileEffectivelyEmpty(text) {
    if (text.trim() === "") return true;
    const ast = parseCss(text);
    if (!ast) return false;
    const kids = childrenArray(ast.children);
    for (const k of kids) {
        if (k.type === "Comment") continue;
        if (k.type === "Rule") {
            const blockKids = childrenArray(k.block && k.block.children);
            if (blockKids.some((b) => b.type === "Declaration")) return false;
            continue;
        }
        if (k.type === "Atrule") return false;
        return false;
    }
    return true;
}

// ─── barrel pruning + cascade cleanup ────────────────────────────────────────

function stripQuotes(s) {
    if (!s || s.length < 2) return s;
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' || first === "'") && first === last) return s.slice(1, -1);
    return s;
}

function pruneBarrelImports(text, importPathsToRemove) {
    const ast = parseCss(text);
    if (!ast) return text;
    const removals = [];
    const targets = new Set(importPathsToRemove);
    cssTree.walk(ast, (node) => {
        if (node.type !== "Atrule" || node.name !== "import") return;
        const prelude = node.prelude && cssTree.generate(node.prelude);
        if (!prelude) return;
        const inner = stripQuotes(prelude.trim());
        if (!targets.has(inner)) return;
        const start = node.loc.start.offset;
        let end = node.loc.end.offset;
        while (end < text.length && (text[end] === " " || text[end] === "\t" || text[end] === ";")) end += 1;
        if (text[end] === "\n") end += 1;
        removals.push({ kind: "barrel-import-removal", start, end, to: "" });
    });
    if (removals.length === 0) return text;
    const merged = mergeAndValidate(removals);
    return applyTextEdits(text, merged);
}

function isBarrelEffectivelyEmpty(text) {
    if (text.trim() === "") return true;
    const ast = parseCss(text);
    if (!ast) return false;
    const kids = childrenArray(ast.children);
    for (const k of kids) {
        if (k.type === "Atrule" && k.name === "import") return false;
        if (k.type === "Comment") continue;
        return false;
    }
    return true;
}

function simulateCascadeCleanup(initialEmptyFiles, fileTextOverrides) {
    const deletedFiles = new Set();
    const deletedDirs = new Set();
    const barrelEdits = [];
    const barrelFinalTexts = new Map();

    function readEffective(filePath) {
        if (barrelFinalTexts.has(filePath)) return barrelFinalTexts.get(filePath);
        if (fileTextOverrides && fileTextOverrides.has(filePath)) return fileTextOverrides.get(filePath);
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
        return null;
    }

    const queue = initialEmptyFiles.slice();
    while (queue.length > 0) {
        const file = queue.shift();
        if (deletedFiles.has(file)) continue;
        deletedFiles.add(file);

        const dir = path.dirname(file);
        const fileName = path.basename(file);
        const barrelPath = path.join(dir, "index.css");
        if (!fs.existsSync(barrelPath)) continue;

        const before = readEffective(barrelPath);
        if (before === null) continue;
        const after = pruneBarrelImports(before, [`./${fileName}`]);
        if (after !== before) {
            barrelFinalTexts.set(barrelPath, after);
            barrelEdits.push({ barrel: barrelPath, removed: `./${fileName}` });
        }

        if (isBarrelEffectivelyEmpty(after)) {
            deletedFiles.add(barrelPath);
            deletedDirs.add(dir);
            const parent = path.dirname(dir);
            const subName = path.basename(dir);
            const parentBarrel = path.join(parent, "index.css");
            if (fs.existsSync(parentBarrel) && !deletedFiles.has(parentBarrel)) {
                const parentBefore = readEffective(parentBarrel);
                if (parentBefore !== null) {
                    const parentAfter = pruneBarrelImports(parentBefore, [
                        `./${subName}/index.css`,
                        `./${subName}/`,
                    ]);
                    if (parentAfter !== parentBefore) {
                        barrelFinalTexts.set(parentBarrel, parentAfter);
                        barrelEdits.push({ barrel: parentBarrel, removed: `./${subName}/index.css` });
                    }
                    if (isBarrelEffectivelyEmpty(parentAfter)) {
                        queue.push(parentBarrel);
                    }
                }
            }
        }
    }

    return { deletedFiles, deletedDirs, barrelEdits, barrelFinalTexts };
}

// ─── tar backup / restore ────────────────────────────────────────────────────

function createTarBackup(touchedFiles, archivePath) {
    const rels = touchedFiles
        .filter((p) => fs.existsSync(p))
        .map((p) => toPosixPath(path.relative(APP_ROOT, p)));
    if (rels.length === 0) return false;
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });
    const manifestPath = archivePath + ".manifest";
    fs.writeFileSync(manifestPath, rels.join("\n"), "utf8");
    const result = spawnSync(
        "tar",
        [
            "--force-local",
            "-czf",
            toPosixPath(archivePath),
            "-C",
            toPosixPath(APP_ROOT),
            "-T",
            toPosixPath(manifestPath),
        ],
        { stdio: "pipe", encoding: "utf8" },
    );
    fs.unlinkSync(manifestPath);
    if (result.status !== 0) {
        console.error(`tar failed (exit ${result.status}):\n${result.stderr || result.stdout}`);
        return false;
    }
    return true;
}

function restoreFromTar(archivePath) {
    if (!archivePath || typeof archivePath !== "string") {
        console.error("--reroll requires an archive path argument: npm run replace:aliases:reroll -- <path>");
        process.exit(1);
    }
    const abs = path.isAbsolute(archivePath) ? archivePath : path.resolve(APP_ROOT, archivePath);
    if (!fs.existsSync(abs)) {
        console.error(`archive not found: ${abs}`);
        process.exit(1);
    }
    const result = spawnSync(
        "tar",
        ["--force-local", "-xzf", toPosixPath(abs), "-C", toPosixPath(APP_ROOT)],
        { stdio: "inherit" },
    );
    if (result.status !== 0) {
        console.error(`tar extract failed (exit ${result.status})`);
        process.exit(1);
    }
    console.log(`restored from ${toPosixPath(path.relative(APP_ROOT, abs))}`);
}

// ─── reporting ───────────────────────────────────────────────────────────────

function snippetOf(text, offset) {
    const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
    let lineEnd = text.indexOf("\n", offset);
    if (lineEnd === -1) lineEnd = text.length;
    return text.slice(lineStart, lineEnd);
}

function writeReport(report) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(`\nDRY RUN — report written to ${toPosixPath(path.relative(APP_ROOT, REPORT_PATH))}`);
}

function printSummary(report) {
    console.log(`\nScanned: ${report.scanned.cssFiles} CSS files, ${report.scanned.jsFiles} JS/TS files`);
    console.log(`Aliases: ${Object.keys(report.aliasMap).length}`);
    for (const [name, info] of Object.entries(report.aliasMap)) {
        console.log(`  ${name} → ${info.target}   (declared in ${info.declaredIn.join(" + ")})`);
    }
    console.log(`\n${DRY ? "Would modify" : "Modified"}:`);
    console.log(`  CSS files touched: ${report.summary.cssFilesTouched}`);
    console.log(`  JS/TS files touched: ${report.summary.jsFilesTouched}`);
    console.log(`  CSS var() use rewrites: ${report.summary.varUseEdits}`);
    console.log(`  CSS alias decl removals: ${report.summary.aliasDeclRemovals}`);
    console.log(`  JS/TS string rewrites: ${report.summary.jsStringEdits}`);
    console.log(`  CSS files deleted (empty after edits): ${report.summary.cssFilesDeleted}`);
    console.log(`  Folders removed: ${report.summary.dirsDeleted}`);
    console.log(`  Barrels edited (import pruned): ${report.summary.barrelsEdited}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

function main() {
    if (REROLL_IDX !== -1) {
        restoreFromTar(REROLL_TARGET);
        return;
    }

    const cssFiles = walkFiles(STYLES_ROOT, new Set([".css"]));
    const jsFiles = [];
    for (const root of TS_ROOTS) {
        jsFiles.push(...walkFiles(root, new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"])));
    }

    const { resolved: aliasMap, declSources, skippedAmbiguous, skippedNonTopLevel } = buildAliasMap(cssFiles);

    const report = {
        scanned: { cssFiles: cssFiles.length, jsFiles: jsFiles.length },
        aliasMap: Object.fromEntries(
            [...aliasMap.entries()].map(([k, v]) => [
                k,
                {
                    target: v,
                    declaredIn: (declSources.get(k) || []).map((d) => `${d.file}:${d.line}`),
                },
            ]),
        ),
        skipped: {
            ambiguous: skippedAmbiguous,
            hasNonTopLevelDecl: skippedNonTopLevel,
        },
        changes: { cssFiles: [], jsFiles: [] },
        cleanup: { deletedFiles: [], deletedDirs: [], barrelEdits: [] },
        errors: [],
        summary: {
            cssFilesTouched: 0,
            jsFilesTouched: 0,
            varUseEdits: 0,
            aliasDeclRemovals: 0,
            jsStringEdits: 0,
            cssFilesDeleted: 0,
            dirsDeleted: 0,
            barrelsEdited: 0,
            cssParseFailures: 0,
            jsParseFailures: 0,
            astVerifyFailures: 0,
            aliasesSkippedAmbiguous: skippedAmbiguous.length,
            aliasesSkippedNonTopLevel: skippedNonTopLevel.length,
        },
    };

    if (aliasMap.size === 0) {
        console.log("no aliases found, nothing to do.");
        if (DRY) writeReport(report);
        return;
    }

    // ── PHASE 1: collect all CSS edits, compute final texts in memory ──
    const cssFinalTexts = new Map();
    const cssEmptyAfter = [];

    for (const file of cssFiles) {
        const rel = relTo(file, STYLES_ROOT);
        if (isCssExempt(rel)) continue;
        const text = fs.readFileSync(file, "utf8");
        let collected;
        try {
            collected = collectCssEditsForFile(text, aliasMap);
        } catch (err) {
            report.errors.push({ file: `styles/${rel}`, error: `edit collection: ${err.message}` });
            continue;
        }
        if (collected.parseError) {
            report.summary.cssParseFailures += 1;
            report.errors.push({ file: `styles/${rel}`, error: "css parse failed" });
            continue;
        }
        if (collected.edits.length === 0) continue;

        let next;
        try {
            next = applyTextEdits(text, collected.edits);
            next = pruneEmptyRootBlocks(next);
        } catch (err) {
            report.errors.push({ file: `styles/${rel}`, error: `apply failed: ${err.message}` });
            continue;
        }

        if (!verifyCssValid(next)) {
            report.summary.astVerifyFailures += 1;
            report.errors.push({ file: `styles/${rel}`, error: "post-edit AST verify failed; SKIPPING file" });
            continue;
        }

        const fileEntry = { file: `styles/${rel}`, edits: [] };
        for (const e of collected.edits) {
            const lc = offsetToLineCol(text, e.start);
            const entry = {
                type: e.kind === "decl-removal" ? "alias-decl-removal" : "css-var-use-rewrite",
                line: lc.line,
                col: lc.col,
                snippet: snippetOf(text, e.start),
            };
            if (e.kind === "decl-removal") {
                entry.prop = e.prop;
                entry.target = e.target;
            } else {
                entry.from = e.from;
                entry.to = e.to;
            }
            fileEntry.edits.push(entry);
        }
        fileEntry.edits.sort((a, b) => a.line - b.line || a.col - b.col);
        report.changes.cssFiles.push(fileEntry);
        report.summary.varUseEdits += collected.useRewriteCount;
        report.summary.aliasDeclRemovals += collected.declRemovalCount;
        report.summary.cssFilesTouched += 1;

        cssFinalTexts.set(file, next);
        if (isCssFileEffectivelyEmpty(next)) cssEmptyAfter.push(file);
    }

    // ── PHASE 2: collect all JS edits, compute final texts in memory ──
    const jsFinalTexts = new Map();

    for (const file of jsFiles) {
        const text = fs.readFileSync(file, "utf8");
        let collected;
        try {
            collected = collectJsEditsForFile(text, aliasMap);
        } catch (err) {
            report.errors.push({ file: relTo(file, APP_ROOT), error: `edit collection: ${err.message}` });
            continue;
        }
        if (collected.parseError) {
            report.summary.jsParseFailures += 1;
            continue;
        }
        if (collected.edits.length === 0) continue;

        let next;
        try {
            next = applyTextEdits(text, collected.edits);
        } catch (err) {
            report.errors.push({ file: relTo(file, APP_ROOT), error: `apply failed: ${err.message}` });
            continue;
        }

        const fileEntry = {
            file: relTo(file, APP_ROOT),
            edits: collected.edits.map((e) => ({
                type: "js-string-rewrite",
                line: e.line,
                col: e.col,
                from: e.from,
                to: e.to,
                snippet: snippetOf(text, e.start),
            })),
        };
        report.changes.jsFiles.push(fileEntry);
        report.summary.jsStringEdits += collected.edits.length;
        report.summary.jsFilesTouched += 1;
        jsFinalTexts.set(file, next);
    }

    // ── PHASE 3: cascade cleanup (simulation; in-memory) ──
    const cleanup = simulateCascadeCleanup(cssEmptyAfter, cssFinalTexts);
    report.cleanup.deletedFiles = [...cleanup.deletedFiles].map((p) => relTo(p, APP_ROOT));
    report.cleanup.deletedDirs = [...cleanup.deletedDirs].map((p) => relTo(p, APP_ROOT));
    report.cleanup.barrelEdits = cleanup.barrelEdits.map((e) => ({
        barrel: relTo(e.barrel, APP_ROOT),
        removed: e.removed,
    }));
    report.summary.cssFilesDeleted = report.cleanup.deletedFiles.filter(
        (f) => f.endsWith(".css") && !f.endsWith("/index.css"),
    ).length;
    report.summary.dirsDeleted = report.cleanup.deletedDirs.length;
    report.summary.barrelsEdited = report.cleanup.barrelEdits.length;

    // ── DRY: write report, exit ──
    if (DRY) {
        writeReport(report);
        printSummary(report);
        if (report.errors.length > 0) {
            console.log(`\nErrors: ${report.errors.length}. See report.errors for details.`);
        }
        return;
    }

    // ── PHASE 4 (apply only): backup BEFORE any write ──
    const touchedSet = new Set();
    for (const f of cssFinalTexts.keys()) touchedSet.add(f);
    for (const f of jsFinalTexts.keys()) touchedSet.add(f);
    for (const f of cleanup.deletedFiles) touchedSet.add(f);
    for (const b of cleanup.barrelFinalTexts.keys()) touchedSet.add(b);
    const touchedFiles = [...touchedSet];

    if (touchedFiles.length === 0) {
        console.log("nothing to apply.");
        return;
    }

    const isoStamp = new Date().toISOString();
    let stamp = "";
    for (let i = 0; i < isoStamp.length; i += 1) {
        const c = isoStamp[i];
        stamp += c === ":" || c === "." ? "-" : c;
    }
    const archivePath = path.join(BACKUPS_DIR, `resolve-css-aliases-${stamp}.tar.gz`);
    const backupOk = createTarBackup(touchedFiles, archivePath);
    if (!backupOk) {
        console.error("\nBackup failed. ABORTING apply to avoid unrecoverable state.");
        process.exit(1);
    }
    report.backup = {
        archive: relTo(archivePath, APP_ROOT),
        fileCount: touchedFiles.length,
    };
    console.log(`\nBackup → ${report.backup.archive} (${report.backup.fileCount} files)`);

    // ── PHASE 5 (apply only): write each file atomically with .tmp + verify ──
    const writeFailures = [];

    for (const [filePath, content] of cssFinalTexts) {
        if (cleanup.deletedFiles.has(filePath)) continue;
        const res = writeAtomicVerified(filePath, content, "css");
        if (!res.ok) writeFailures.push({ file: relTo(filePath, APP_ROOT), error: res.error });
    }
    for (const [filePath, content] of jsFinalTexts) {
        const res = writeAtomicVerified(filePath, content, "js");
        if (!res.ok) writeFailures.push({ file: relTo(filePath, APP_ROOT), error: res.error });
    }
    for (const [barrelPath, content] of cleanup.barrelFinalTexts) {
        if (cleanup.deletedFiles.has(barrelPath)) continue;
        const res = writeAtomicVerified(barrelPath, content, "css");
        if (!res.ok) writeFailures.push({ file: relTo(barrelPath, APP_ROOT), error: res.error });
    }
    for (const f of cleanup.deletedFiles) {
        if (fs.existsSync(f)) {
            try {
                fs.rmSync(f);
            } catch (err) {
                writeFailures.push({ file: relTo(f, APP_ROOT), error: `delete failed: ${err.message}` });
            }
        }
    }
    for (const d of cleanup.deletedDirs) {
        if (fs.existsSync(d)) {
            try {
                if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);
            } catch {
                // dir not empty or in use; leave it
            }
        }
    }

    if (writeFailures.length > 0) {
        report.writeFailures = writeFailures;
        console.error(`\n${writeFailures.length} per-file failure(s) during apply (originals preserved for those):`);
        for (const f of writeFailures) console.error(`  ${f.file} — ${f.error}`);
        console.error(`\nReroll-all if needed: npm run replace:aliases:reroll -- ${report.backup.archive}`);
    }

    printSummary(report);
    console.log(`\nReroll if needed: npm run replace:aliases:reroll -- ${report.backup.archive}`);
    if (report.errors.length > 0) {
        console.log(`\nNote: ${report.errors.length} error(s) during apply. Files with errors were SKIPPED.`);
    }
}

main();
