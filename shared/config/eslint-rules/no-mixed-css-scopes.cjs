"use strict";

const fs = require("fs");
const path = require("path");

const MOBILE_MEDIA_FEATURES = /\b(width|min-width|max-width|orientation|pointer|hover|aspect-ratio)\b/i;

const EXCLUSIONS_PATH = path.join(__dirname, "no-mixed-css-scopes.exclusions.cjs");
let EXCLUSIONS_CACHE = null;
function loadExclusions() {
    if (EXCLUSIONS_CACHE) return EXCLUSIONS_CACHE;
    try {
        EXCLUSIONS_CACHE = require(EXCLUSIONS_PATH);
    } catch {
        EXCLUSIONS_CACHE = [];
    }
    return EXCLUSIONS_CACHE;
}

const KIND_SUFFIX = ["component", "page", "effect", "tokens", "global", "reset", "utility"];

const PAGE_COLLECTIONS = {
    clans: { singular: "clan", bemPrefix: "clans" },
    routes: { singular: "route", bemPrefix: "route" },
};
const SINGLE_PAGE_FOLDERS = new Set(["dashboard", "account"]);

const TOKEN_CONCERN_PREFIXES = {
    "base-colors": ["--base-"],
    "surface-colors": ["--clr-surface-"],
    "text-colors": ["--clr-text-"],
    "accent-colors": ["--clr-accent-"],
    "border": ["--clr-border-", "--border-", "--bw-"],
    "danger-colors": ["--clr-danger-"],
    "success-colors": ["--clr-success-"],
    "warn-colors": ["--clr-warn-"],
    "highlight-colors": ["--clr-highlight-"],
    "purpose-colors": ["--clr-rank-", "--clr-message-"],
    "gradients": ["--gradient-"],
    "shadows": ["--shadow-"],
    "typography": ["--fs-", "--lh-", "--fw-", "--ls-", "--font-"],
    "optical": ["--opt-"],
    "measurements": ["--sp-", "--max-width", "--nav-height", "--avatar-size", "--grid-min", "--tt-width", "--icon-"],
    "radius": ["--radius-"],
    "motion": ["--ease-", "--dur-"],
    "z-index": ["--z-"],
    "opacity": ["--opacity-"],
    "blur": ["--blur-"],
    "legacy-aliases": null,
    "rank-colors": null,
    "misc-scale": null,
};

function toPosix(p) {
    return p.split(path.sep).join("/");
}

function bemBlock(className) {
    let cut = className.length;
    const i = className.indexOf("__");
    const j = className.indexOf("--");
    if (i >= 0 && i < cut) cut = i;
    if (j >= 0 && j < cut) cut = j;
    return className.slice(0, cut);
}

function bemChild(className) {
    const i = className.indexOf("__");
    if (i < 0) return null;
    const after = className.slice(i + 2);
    const m = after.indexOf("--");
    return m < 0 ? after : after.slice(0, m);
}

function firstSegment(s) {
    const i = s.indexOf("-");
    return i < 0 ? s : s.slice(0, i);
}

function isExcluded(absFile) {
    const norm = toPosix(absFile);
    for (const entry of loadExclusions()) {
        if (!entry) continue;
        if (typeof entry.file === "string") {
            const ent = entry.file.split(/[\\/]/).join("/");
            if (norm === ent || norm.endsWith("/" + ent)) return true;
        }
        if (typeof entry.path === "string") {
            const ent = entry.path.split(/[\\/]/).join("/");
            if (norm.includes("/" + ent) || norm.includes(ent)) return true;
        }
    }
    return false;
}

function childrenArray(listLike) {
    if (!listLike) return [];
    if (Array.isArray(listLike)) return listLike;
    if (typeof listLike.toArray === "function") return listLike.toArray();
    return [...listLike];
}

function selectorText(sel) {
    if (!sel || !sel.children) return sel?.type || "";
    const parts = childrenArray(sel.children);
    return parts
        .map((c) => {
            if (c.type === "ClassSelector") return "." + c.name;
            if (c.type === "TypeSelector") return c.name;
            if (c.type === "IdSelector") return "#" + c.name;
            if (c.type === "PseudoClassSelector") return ":" + c.name;
            if (c.type === "PseudoElementSelector") return "::" + c.name;
            if (c.type === "AttributeSelector") return "[attr]";
            if (c.type === "Combinator") return c.name === " " ? " " : c.name;
            return c.type;
        })
        .join("");
}

function classify(absFile) {
    const norm = toPosix(absFile);
    const stylesIdx = norm.indexOf("/main/dashboard/src/styles/");
    if (stylesIdx < 0) return { kind: "unknown" };
    const rel = norm.slice(stylesIdx + "/main/dashboard/src/styles/".length);
    const parts = rel.split("/");
    const file = parts[parts.length - 1];
    if (file === "index.css") return { kind: "barrel", dir: parts.slice(0, -1).join("/") };

    let base = file.replace(/\.css$/, "");
    let mobile = false;
    if (base.endsWith("-mobile")) {
        mobile = true;
        base = base.slice(0, -"-mobile".length);
    }
    let suffix = null;
    for (const k of KIND_SUFFIX) {
        if (base.endsWith("-" + k)) {
            suffix = k;
            break;
        }
    }
    if (!suffix) return { kind: "unsuffixed" };
    const beforeSuffix = base.slice(0, base.length - suffix.length - 1);

    const top = parts[0];
    const inner = classifyForTopFolder(top, parts, beforeSuffix, suffix);
    inner.mobile = mobile;
    if (mobile) {
        const baseFile = file.replace(/-mobile\.css$/, ".css");
        const baseAbs = path.join(absFile, "..", baseFile);
        inner.baseSibling = baseAbs;
        inner.baseSiblingExists = fs.existsSync(baseAbs);
    }
    return inner;
}

function classifyForTopFolder(top, parts, beforeSuffix, suffix) {
    if (top === "tokens") {
        if (parts.length !== 3 || suffix !== "tokens") {
            return { kind: "tokens-malformed", expected: "tokens/<concern>/<file>-tokens.css", got: parts.join("/") };
        }
        return { kind: "token", concernFolder: parts[1], concernName: beforeSuffix };
    }
    if (top === "globals") {
        if (parts.length !== 3) return { kind: "wrong-depth", expected: 3, actual: parts.length };
        const sub = parts[1];
        if (sub === "base" && suffix === "global") return { kind: "global-base", concern: beforeSuffix };
        if (sub === "resets" && suffix === "reset") return { kind: "global-reset", concern: beforeSuffix };
        if (sub === "utilities" && suffix === "utility") return { kind: "global-utility", scope: beforeSuffix };
        return { kind: "globals-malformed", sub, suffix };
    }
    if (top === "effects") {
        if (parts.length !== 3 || suffix !== "effect") return { kind: "wrong-depth", expected: 3, actual: parts.length };
        const family = parts[1];
        const scopeA = beforeSuffix;
        const scopeB = `${family}-${beforeSuffix}`;
        return { kind: "effect", family, candidates: [scopeB, scopeA] };
    }
    if (top === "components") {
        if (parts.length !== 3 || suffix !== "component") return { kind: "wrong-depth", expected: 3, actual: parts.length };
        const family = parts[1];
        const scopeA = beforeSuffix;
        const scopeB = `${family}-${beforeSuffix}`;
        return { kind: "component", family, candidates: [scopeA, scopeB] };
    }
    if (top === "pages") {
        if (suffix !== "page") return { kind: "wrong-suffix", expected: "page", got: suffix };
        const folderSegs = parts.slice(1, -1);
        return classifyPage(folderSegs, beforeSuffix);
    }
    return { kind: "unknown" };
}

// recursive page classifier — handles any folder-depth >= 1 under `pages/`. `folderSegs`
// is just the folder chain between `pages/` and the file (no filename). the BEM scope a
// page-area file paints depends ONLY on the first 1-2 folder segments (single-page top
// OR collection+subpage); deeper area subfolders (introduced by the dom/styles mirror)
// are area decomposition and dont change the scope. one function covers depths 1..N
// instead of a per-depth ladder.
function classifyPage(folderSegs, beforeSuffix) {
    if (folderSegs.length < 1) return { kind: "page-malformed", folder: "(root)" };
    const top = folderSegs[0];
    if (SINGLE_PAGE_FOLDERS.has(top)) return classifyPageSinglePage(top, folderSegs, beforeSuffix);
    const conf = PAGE_COLLECTIONS[top];
    if (!conf) return { kind: "page-malformed", folder: top };
    return classifyPageCollection(top, conf, folderSegs, beforeSuffix);
}

function classifyPageSinglePage(top, folderSegs, beforeSuffix) {
    if (folderSegs.length === 1) {
        if (beforeSuffix === top) return { kind: "page-root", page: top };
        return { kind: "page-area", page: top, area: beforeSuffix };
    }
    const subpage = folderSegs[1];
    const page = `${top}-${subpage}`;
    if (beforeSuffix === subpage) return { kind: "page-root", page };
    return { kind: "page-area", page, area: beforeSuffix };
}

function classifyPageCollection(top, conf, folderSegs, beforeSuffix) {
    const singular = conf.singular;
    if (folderSegs.length === 1) {
        if (top === "clans") {
            if (beforeSuffix === singular) return { kind: "page-root", page: `${conf.bemPrefix}-${singular}` };
            if (beforeSuffix.startsWith(singular + "-")) {
                return { kind: "page-area", page: `${conf.bemPrefix}-${singular}`, area: beforeSuffix.slice(singular.length + 1) };
            }
            return { kind: "page-malformed", folder: top };
        }
        if (top === "routes") {
            if (beforeSuffix.startsWith(singular + "-")) return { kind: "page-root", page: beforeSuffix };
            return { kind: "page-malformed", folder: top };
        }
        return { kind: "page-malformed", folder: top };
    }
    const subpage = folderSegs[1];
    const page = `${conf.bemPrefix}-${subpage}`;
    if (beforeSuffix === singular) return { kind: "page-root", page };
    if (beforeSuffix.startsWith(singular + "-")) {
        return { kind: "page-area", page, area: beforeSuffix.slice(singular.length + 1) };
    }
    return { kind: "page-malformed", folder: folderSegs.join("/") };
}

let SCOPE_INDEX = null;
let DUPE_INDEX = null;

function scanStylesTree() {
    if (SCOPE_INDEX !== null) return;
    SCOPE_INDEX = new Map();
    const findRoot = () => {
        let dir = __dirname;
        for (let i = 0; i < 6; i += 1) {
            const candidate = path.join(dir, "main", "dashboard", "src", "styles");
            if (fs.existsSync(candidate)) return candidate;
            dir = path.dirname(dir);
        }
        return null;
    };
    const root = findRoot();
    if (!root) return;
    function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.isFile() && e.name.endsWith(".css") && e.name !== "index.css") {
                if (isExcluded(p)) continue;
                const m = classify(p);
                if (!m) continue;
                let key = null;
                if (m.kind === "component") key = `component:${m.candidates[0]}`;
                else if (m.kind === "effect") key = `effect:${m.scope}`;
                else if (m.kind === "global-utility") key = `utility:${m.scope}`;
                else if (m.kind === "page-area") key = `page-area:${m.page}/${m.area}`;
                else if (m.kind === "page-root") key = `page-root:${m.page}`;
                else if (m.kind === "token") key = `token:${m.concern}`;
                else if (m.kind === "global-base") key = `global-base:${m.concern}`;
                else if (m.kind === "global-reset") key = `global-reset:${m.concern}`;
                if (!key) continue;
                if (m.mobile) key = `${key}::mobile`;
                if (!SCOPE_INDEX.has(key)) SCOPE_INDEX.set(key, []);
                SCOPE_INDEX.get(key).push(toPosix(path.relative(root, p)));
            }
        }
    }
    walk(root);
}

const MIN_DECLS_FOR_DUPE = 6;

function hashRule(rule, sourceCode) {
    const decls = [];
    const block = rule.block;
    if (block && block.children) {
        const arr = typeof block.children.toArray === "function" ? block.children.toArray() : [...block.children];
        for (const c of arr) {
            if (c.type !== "Declaration") continue;
            const valText = sourceCode && c.value ? sourceCode.getText(c.value).replace(/\s+/g, " ").trim() : "";
            decls.push(`${c.property}:${valText}`);
        }
    }
    if (decls.length < MIN_DECLS_FOR_DUPE) return null;
    const hasNonVar = decls.some((d) => !/^[^:]+:\s*var\(/.test(d));
    if (!hasNonVar) return null;
    return decls.sort().join(";");
}

function buildDupeIndex() {
    if (DUPE_INDEX !== null) return;
    DUPE_INDEX = new Map();
}

function tokenConcernAllows(concern, varName) {
    const prefixes = TOKEN_CONCERN_PREFIXES[concern];
    if (prefixes === undefined) return false;
    if (prefixes === null) return true;
    for (const p of prefixes) {
        if (varName === p || varName.startsWith(p)) return true;
    }
    return false;
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Hyper-organized CSS layout enforcement. Filename + folder define file kind and scope. Var decls (--*) only in tokens/<concern>-token.css matching the concern. Class selectors only in scope files matching filename. Global selectors only in globals/ folder.",
        },
        schema: [],
        messages: {
            wrongScope:
                'File "{{file}}" expects scope "{{expected}}" but selector uses BEM block "{{found}}". Move to a {{found}}-{{kind}}.css file.',
            wrongScopeCandidates:
                'File "{{file}}" expects scope "{{a}}" or "{{b}}" (filename ambiguous), but selector uses BEM block "{{found}}".',
            wrongPage:
                'File "{{file}}" expects page scope "{{page}}" but selector uses BEM block "{{found}}".',
            wrongArea:
                'File "{{file}}" expects area "{{area}}" under page "{{page}}", but selector targets area "{{found}}". Move to {{page}}-{{found}}-page.css.',
            rootFileHasChild:
                'File "{{file}}" is the page root; only .{{page}} and .{{page}}--<modifier> allowed. Found "{{found}}".',
            classInTokens:
                'File "{{file}}" is a token file; class selectors not allowed (found ".{{found}}"). Move to a component / page / utility file.',
            classInGlobalBase:
                'File "{{file}}" is globals/base; class selectors not allowed (found ".{{found}}"). Move to components/<family>/ or globals/utilities/.',
            classInGlobalReset:
                'File "{{file}}" is globals/resets; class selectors not allowed (found ".{{found}}"). Resets are type/element selectors only.',
            globalInScope:
                'File "{{file}}" is a {{kind}} file; non-class selectors not allowed (found "{{selector}}"). Move type/id/attribute selectors to globals/base/.',
            rootSelectorOutsideTokens:
                'File "{{file}}" is not a token file; :root declarations not allowed here. Move CSS variables to tokens/<concern>-token.css.',
            tokenLeak:
                'File "{{file}}" is a {{kind}} file; CSS variable definition "{{var}}" not allowed outside tokens/. Move to tokens/<concern>-token.css.',
            tokenConcernMismatch:
                'File "{{file}}" is token concern "{{concern}}"; CSS variable "{{var}}" does not match this concern. Move to the matching tokens/<correctConcern>-token.css.',
            unknownTokenConcern:
                'File "{{file}}" uses unknown token concern "{{concern}}". Valid concerns: {{valid}}.',
            utilityHasOtherScope:
                'Utility file "{{file}}" expects scope "{{expected}}" but selector uses BEM block "{{found}}".',
            wrongSuffix:
                'File "{{file}}" must end in -<kind>.css where kind ∈ {component, page, effect, token, global, reset, utility}.',
            malformedPage:
                'Page area file "{{file}}" must be <page>-page.css (root) or <page>-<area>-page.css. Parent folder is "{{page}}".',
            duplicateScope:
                'Scope "{{scope}}" declared in multiple files: {{files}}. Each BEM scope must live in exactly one file — merge or rename.',
            duplicateRuleShape:
                'Rule shape (selector + declarations) duplicates one already declared in {{otherFile}}. Move to a shared component or extract a utility.',
            wrongDepth:
                'File "{{file}}" is at the wrong depth (expected {{expected}} path segments, got {{actual}}).',
            barrelHasRule:
                'Barrel "{{file}}" must contain only @import statements (no CSS rules).',
            barrelHasDecl:
                'Barrel "{{file}}" must contain only @import statements (found declaration "{{prop}}").',
            barrelHasNonImport:
                'Barrel "{{file}}" must contain only @import statements (found @{{atRule}}).',
            mobileNotAdjacent:
                'Barrel "{{file}}": "{{base}}" has a mobile companion "{{mobile}}" but it is not imported immediately after.',
            importOutsideBarrel:
                '@import only allowed in barrel index.css files (found in "{{file}}").',
            fontFaceOutsideGlobalsBase:
                '@font-face only allowed in globals/base/ (found in "{{file}}").',
            propertyAtRuleOutsideAllowed:
                '@property only allowed in globals/base/ or tokens/ (found in "{{file}}").',
            mobileTopLevelRule:
                'Mobile file "{{file}}" must wrap all rules in @media (viewport) blocks; top-level rule not allowed.',
            mobileNonViewportMedia:
                'Mobile file "{{file}}" @media must be viewport-related (width / orientation / pointer / hover). Found "({{params}})".',
            mobileWithoutBase:
                'Mobile file "{{file}}" requires a sibling base file "{{expected}}" which does not exist.',
            tokensMalformed:
                'Token file "{{file}}" must be at "{{expected}}" (got "{{got}}").',
            globalsMalformed:
                'Globals file "{{file}}" has wrong subfolder/suffix pair (sub: "{{sub}}", suffix: "{{suffix}}").',
        },
    },
    create(context) {
        const filename = context.filename || (context.getFilename && context.getFilename());
        if (!filename || !filename.toLowerCase().endsWith(".css")) return {};
        if (isExcluded(filename)) return {};

        scanStylesTree();
        buildDupeIndex();
        const meta = classify(filename);
        if (meta.kind === "unknown") return {};
        const fileLabel = path.basename(filename);
        const sourceCode = context.sourceCode || (context.getSourceCode && context.getSourceCode());

        let dupeKey = null;
        if (SCOPE_INDEX) {
            if (meta.kind === "component") dupeKey = `component:${meta.candidates[0]}`;
            else if (meta.kind === "effect") dupeKey = `effect:${meta.candidates[0]}`;
            else if (meta.kind === "global-utility") dupeKey = `utility:${meta.scope}`;
            else if (meta.kind === "page-area") dupeKey = `page-area:${meta.page}/${meta.area}`;
            else if (meta.kind === "page-root") dupeKey = `page-root:${meta.page}`;
            else if (meta.kind === "token") dupeKey = `token:${meta.concernName}`;
            else if (meta.kind === "global-base") dupeKey = `global-base:${meta.concern}`;
            else if (meta.kind === "global-reset") dupeKey = `global-reset:${meta.concern}`;
            if (dupeKey && meta.mobile) dupeKey = `${dupeKey}::mobile`;
        }

        if (meta.kind === "barrel") {
            const barrelDir = path.dirname(filename);
            const importsSeen = [];
            return {
                Rule(node) {
                    context.report({ loc: node.loc, messageId: "barrelHasRule", data: { file: fileLabel } });
                },
                Declaration(node) {
                    context.report({ loc: node.loc, messageId: "barrelHasDecl", data: { file: fileLabel, prop: node.property || "?" } });
                },
                Atrule(node) {
                    const aname = (node.name || "").toLowerCase();
                    if (aname !== "import") {
                        context.report({ loc: node.loc, messageId: "barrelHasNonImport", data: { file: fileLabel, atRule: aname } });
                        return;
                    }
                    const txt = sourceCode && node.prelude ? sourceCode.getText(node.prelude) : "";
                    const m = txt.match(/["']([^"']+)["']/);
                    if (!m) return;
                    importsSeen.push({ atrule: node, file: m[1] });
                },
                "StyleSheet:exit"() {
                    for (let i = 0; i < importsSeen.length; i += 1) {
                        const cur = importsSeen[i];
                        if (cur.file.endsWith("/index.css") || cur.file === "./index.css") continue;
                        const importedFile = cur.file.replace(/^\.\//, "");
                        if (importedFile.endsWith("-mobile.css")) continue;
                        const mobileVariant = importedFile.replace(/\.css$/, "-mobile.css");
                        const mobileAbs = path.join(barrelDir, mobileVariant);
                        if (!fs.existsSync(mobileAbs)) continue;
                        const next = importsSeen[i + 1];
                        const expectedNext = `./${mobileVariant}`;
                        if (!next || next.file !== expectedNext) {
                            context.report({
                                loc: cur.atrule.loc,
                                messageId: "mobileNotAdjacent",
                                data: { file: fileLabel, base: importedFile, mobile: mobileVariant },
                            });
                        }
                    }
                },
            };
        }

        if (meta.kind === "wrong-depth") {
            return {
                Rule(node) {
                    context.report({ loc: node.loc, messageId: "wrongDepth", data: { file: fileLabel, expected: meta.expected, actual: meta.actual } });
                },
            };
        }

        if (meta.kind === "unsuffixed") {
            // Report once at file-level by using Atrule or Rule fallback
            return {
                Rule(node) {
                    context.report({ loc: node.loc, messageId: "wrongSuffix", data: { file: fileLabel } });
                },
                Atrule(node) {
                    context.report({ loc: node.loc, messageId: "wrongSuffix", data: { file: fileLabel } });
                },
            };
        }
        if (meta.kind === "page-malformed") {
            return {
                Rule(node) {
                    context.report({
                        loc: node.loc,
                        messageId: "malformedPage",
                        data: { file: fileLabel, page: meta.folder },
                    });
                },
            };
        }
        if (meta.kind === "tokens-malformed") {
            return {
                Rule(node) { context.report({ loc: node.loc, messageId: "tokensMalformed", data: { file: fileLabel, expected: meta.expected, got: meta.got } }); },
                Declaration(node) { context.report({ loc: node.loc, messageId: "tokensMalformed", data: { file: fileLabel, expected: meta.expected, got: meta.got } }); },
            };
        }
        if (meta.kind === "globals-malformed") {
            return {
                Rule(node) { context.report({ loc: node.loc, messageId: "globalsMalformed", data: { file: fileLabel, sub: meta.sub, suffix: meta.suffix } }); },
            };
        }
        if (meta.kind === "wrong-suffix") {
            return {
                Rule(node) { context.report({ loc: node.loc, messageId: "wrongSuffix", data: { file: fileLabel } }); },
            };
        }
        if (meta.kind === "token" && !(meta.concernName in TOKEN_CONCERN_PREFIXES)) {
            return {
                Declaration(node) {
                    context.report({
                        loc: node.loc,
                        messageId: "unknownTokenConcern",
                        data: {
                            file: fileLabel,
                            concern: meta.concernName,
                            valid: Object.keys(TOKEN_CONCERN_PREFIXES).join(", "),
                        },
                    });
                },
            };
        }

        if (meta.mobile && !meta.baseSiblingExists) {
            return {
                Rule(node) {
                    context.report({ loc: node.loc, messageId: "mobileWithoutBase", data: { file: fileLabel, expected: path.basename(meta.baseSibling) } });
                },
            };
        }

        let keyframesDepth = 0;
        let lockedScope = null;
        let mediaDepth = 0;
        let reportedDupeScope = false;

        function checkDuplicateScope(node) {
            if (reportedDupeScope || !dupeKey || !SCOPE_INDEX) return;
            const peers = SCOPE_INDEX.get(dupeKey);
            if (!peers || peers.length < 2) return;
            reportedDupeScope = true;
            context.report({
                loc: node.loc,
                messageId: "duplicateScope",
                data: { scope: dupeKey, files: peers.join(", ") },
            });
        }

        return {
            "Atrule[name=/^(-webkit-)?keyframes$/i]"() {
                keyframesDepth += 1;
            },
            "Atrule[name=/^(-webkit-)?keyframes$/i]:exit"() {
                keyframesDepth -= 1;
            },
            "Atrule[name=/^media$/i]"(node) {
                mediaDepth += 1;
                if (meta.mobile) {
                    const txt = sourceCode && node.prelude ? sourceCode.getText(node.prelude) : "";
                    if (!MOBILE_MEDIA_FEATURES.test(txt)) {
                        context.report({ loc: node.loc, messageId: "mobileNonViewportMedia", data: { file: fileLabel, params: txt } });
                    }
                }
            },
            "Atrule[name=/^media$/i]:exit"() {
                mediaDepth -= 1;
            },
            "Atrule[name=/^import$/i]"(node) {
                context.report({ loc: node.loc, messageId: "importOutsideBarrel", data: { file: fileLabel } });
            },
            "Atrule[name=/^font-face$/i]"(node) {
                if (meta.kind !== "global-base") {
                    context.report({ loc: node.loc, messageId: "fontFaceOutsideGlobalsBase", data: { file: fileLabel } });
                }
            },
            "Atrule[name=/^property$/i]"(node) {
                if (meta.kind !== "global-base" && meta.kind !== "token") {
                    context.report({ loc: node.loc, messageId: "propertyAtRuleOutsideAllowed", data: { file: fileLabel } });
                }
            },
            Rule(node) {
                if (keyframesDepth > 0) return;
                checkDuplicateScope(node);
                if (meta.mobile && mediaDepth === 0) {
                    context.report({ loc: node.loc, messageId: "mobileTopLevelRule", data: { file: fileLabel } });
                    return;
                }
                const shape = hashRule(node, sourceCode);
                if (shape) {
                    const existing = DUPE_INDEX.get(shape);
                    if (existing && existing !== fileLabel) {
                        context.report({
                            loc: node.loc,
                            messageId: "duplicateRuleShape",
                            data: { otherFile: existing },
                        });
                    } else if (!existing) {
                        DUPE_INDEX.set(shape, fileLabel);
                    }
                }

                const prelude = node.prelude;
                if (!prelude || prelude.type !== "SelectorList") return;
                const selectors = childrenArray(prelude.children);

                let isRootRule = false;
                for (const sel of selectors) {
                    if (!sel || !sel.children) continue;
                    const parts = childrenArray(sel.children);
                    const onlyRootPseudo =
                        parts.length === 1 &&
                        parts[0].type === "PseudoClassSelector" &&
                        parts[0].name === "root";
                    if (onlyRootPseudo) isRootRule = true;
                }

                if (isRootRule && meta.kind !== "token") {
                    context.report({
                        loc: node.loc,
                        messageId: "rootSelectorOutsideTokens",
                        data: { file: fileLabel },
                    });
                }

                for (const sel of selectors) {
                    if (!sel || !sel.children) continue;
                    const parts = childrenArray(sel.children);
                    const firstClass = parts.find((c) => c && c.type === "ClassSelector");

                    if (meta.kind === "token") {
                        if (firstClass) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "classInTokens",
                                data: { file: fileLabel, found: firstClass.name },
                            });
                        }
                        continue;
                    }
                    if (meta.kind === "global-base") {
                        if (firstClass) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "classInGlobalBase",
                                data: { file: fileLabel, found: firstClass.name },
                            });
                        }
                        continue;
                    }
                    if (meta.kind === "global-reset") {
                        if (firstClass) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "classInGlobalReset",
                                data: { file: fileLabel, found: firstClass.name },
                            });
                        }
                        continue;
                    }

                    if (!firstClass) {
                        context.report({
                            loc: sel.loc || node.loc,
                            messageId: "globalInScope",
                            data: { file: fileLabel, kind: meta.kind, selector: selectorText(sel) },
                        });
                        continue;
                    }

                    const name = firstClass.name;
                    const block = bemBlock(name);

                    if (meta.kind === "global-utility") {
                        if (block !== meta.scope) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "utilityHasOtherScope",
                                data: { file: fileLabel, expected: meta.scope, found: block },
                            });
                        }
                        continue;
                    }
                    if (meta.kind === "effect") {
                        const candidates = meta.candidates;
                        if (!lockedScope) {
                            if (candidates.includes(block)) {
                                lockedScope = block;
                            } else {
                                context.report({
                                    loc: firstClass.loc || node.loc,
                                    messageId: "wrongScope",
                                    data: { file: fileLabel, expected: candidates[0], found: block, kind: "effect" },
                                });
                            }
                        } else if (block !== lockedScope) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "wrongScope",
                                data: { file: fileLabel, expected: lockedScope, found: block, kind: "effect" },
                            });
                        }
                        continue;
                    }
                    if (meta.kind === "component") {
                        const candidates = meta.candidates;
                        if (!lockedScope) {
                            if (candidates.includes(block)) {
                                lockedScope = block;
                            } else {
                                context.report({
                                    loc: firstClass.loc || node.loc,
                                    messageId: candidates.length > 1 ? "wrongScopeCandidates" : "wrongScope",
                                    data: candidates.length > 1
                                        ? { file: fileLabel, a: candidates[0], b: candidates[1], found: block }
                                        : { file: fileLabel, expected: candidates[0], found: block, kind: "component" },
                                });
                            }
                        } else if (block !== lockedScope) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "wrongScope",
                                data: { file: fileLabel, expected: lockedScope, found: block, kind: "component" },
                            });
                        }
                        continue;
                    }
                    if (meta.kind === "page-root") {
                        if (block !== meta.page) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "wrongPage",
                                data: { file: fileLabel, page: meta.page, found: block },
                            });
                        } else if (bemChild(name) !== null) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "rootFileHasChild",
                                data: { file: fileLabel, page: meta.page, found: name },
                            });
                        }
                        continue;
                    }
                    if (meta.kind === "page-area") {
                        if (block !== meta.page) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "wrongPage",
                                data: { file: fileLabel, page: meta.page, found: block },
                            });
                            continue;
                        }
                        const child = bemChild(name);
                        const childSeg = child ? firstSegment(child) : "(root)";
                        if (childSeg !== meta.area) {
                            context.report({
                                loc: firstClass.loc || node.loc,
                                messageId: "wrongArea",
                                data: { file: fileLabel, page: meta.page, area: meta.area, found: childSeg },
                            });
                        }
                    }
                }
            },
            Declaration(node) {
                const prop = node.property || "";
                if (!prop.startsWith("--")) return;

                if (meta.kind === "token") {
                    if (!tokenConcernAllows(meta.concernName, prop)) {
                        context.report({
                            loc: node.loc,
                            messageId: "tokenConcernMismatch",
                            data: { file: fileLabel, concern: meta.concernName, var: prop },
                        });
                    }
                    return;
                }

                context.report({
                    loc: node.loc,
                    messageId: "tokenLeak",
                    data: { file: fileLabel, kind: meta.kind, var: prop },
                });
            },
        };
    },
};
