#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parse } = require("@typescript-eslint/typescript-estree");
const { hashNode, getObjKeys } = require("../../shared/config/eslint-rules/duplication-hash.cjs");
const { build4DReport } = require("../../shared/config/eslint-rules/report-builder.cjs");
const pathsConfig = require("../../shared/config/paths.json");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const THRESHOLDS = {
    literal: 3,
    structural: 2,
    logical: 2,
    data: 2,
    behavioral: 2,
    config: 2,
    validation: 2,
    temporal: 2,
};

const MIN_LITERAL_STRING_LEN = 3;
const MIN_FUNC_HASH_LEN = 15;
const MIN_COND_HASH_LEN = 5;
const MIN_OBJ_KEYS = 3;
const MAX_LOCATIONS_SHOWN = 10;

const TYPEOF_TYPES = new Set(["string", "number", "boolean", "object", "function", "undefined", "symbol", "bigint", "u"]);
const TRIVIAL_NUMBERS = new Set([-1, 0, 1, 2]);
const TRIVIAL_STRINGS = new Set([", ", " | ", "/", ".", ":", "-", "_", " ", "\n", "\t", "?", "*", "(", ")"]);

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function walkDir(dir, exclude, out) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(REPO_ROOT, full).replace(/\\/g, "/");
        if (exclude.some(e => rel.includes(e))) continue;
        if (entry.isDirectory()) {
            walkDir(full, exclude, out);
        } else if (entry.isFile()) {
            out.push(full);
        }
    }
}

function collectFiles(moduleName, moduleConfig) {
    const root = path.resolve(REPO_ROOT, moduleConfig.root);
    if (!fs.existsSync(root)) return [];
    const files = [];
    const exclude = moduleConfig.exclude || [];
    walkDir(root, exclude, files);
    const ext = moduleConfig.language === "ts" ? ".ts" : ".js";
    return files.filter(f => f.endsWith(ext));
}

function parseFile(filePath, language) {
    const source = fs.readFileSync(filePath, "utf8");
    const isTs = language === "ts";
    return parse(source, {
        loc: true,
        range: true,
        jsx: false,
        useJSXTextNode: false,
        comment: false,
        tokens: false,
        ...(isTs ? {} : {}),
    });
}

function getEnclosing(node) {
    let p = node.parent;
    while (p) {
        if (p.type === "FunctionDeclaration" && p.id) return p.id.name + "()";
        if (p.type === "VariableDeclarator" && p.id) return p.id.name;
        if (p.type === "MethodDefinition" && p.key) return p.key.name + "()";
        if (p.type === "Property" && p.key) return (p.key.name || p.key.value || "") + "()";
        p = p.parent;
    }
    return "module scope";
}

function attachParents(node, parent) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const item of node) attachParents(item, parent);
        return;
    }
    if (typeof node.type !== "string") return;
    node.parent = parent;
    for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "range") continue;
        const val = node[key];
        if (val && typeof val === "object") attachParents(val, node);
    }
}

function walkAst(node, visitors) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const item of node) walkAst(item, visitors);
        return;
    }
    if (typeof node.type !== "string") return;
    const fn = visitors[node.type];
    if (fn) fn(node);
    for (const key of Object.keys(node)) {
        if (key === "parent" || key === "loc" || key === "range") continue;
        const val = node[key];
        if (val && typeof val === "object") walkAst(val, visitors);
    }
}

function relPath(absPath) {
    return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function collectFromFile(absPath, language, moduleName, collectors) {
    let ast;
    try {
        ast = parseFile(absPath, language);
    } catch (err) {
        console.error(`${YELLOW}skip ${relPath(absPath)}: ${err.message}${RESET}`);
        return;
    }
    attachParents(ast, null);
    const file = relPath(absPath);

    walkAst(ast, {
        Literal(node) {
            if (node.parent && node.parent.type === "ImportDeclaration") return;
            if (node.regex) return;
            if (typeof node.value === "boolean") return;
            if (node.value === null) return;
            if (typeof node.value === "string") {
                if (node.value.length < MIN_LITERAL_STRING_LEN) return;
                if (TYPEOF_TYPES.has(node.value)) return;
                if (TRIVIAL_STRINGS.has(node.value)) return;
            }
            if (typeof node.value === "number" && TRIVIAL_NUMBERS.has(node.value)) return;
            const key = `${moduleName}::${JSON.stringify(node.value)}`;
            if (!collectors.literals.has(key)) collectors.literals.set(key, []);
            collectors.literals.get(key).push({ file, line: node.loc.start.line, value: node.value });
        },
        FunctionDeclaration(node) {
            collectFunc(node, moduleName, file, collectors);
        },
        FunctionExpression(node) {
            collectFunc(node, moduleName, file, collectors);
        },
        ArrowFunctionExpression(node) {
            collectFunc(node, moduleName, file, collectors);
        },
        IfStatement(node) {
            const hash = hashNode(node.test, 0);
            if (hash.length < MIN_COND_HASH_LEN) return;
            const key = `${moduleName}::${hash}`;
            if (!collectors.conditions.has(key)) collectors.conditions.set(key, []);
            collectors.conditions.get(key).push({ file, line: node.loc.start.line, hash });
        },
        ObjectExpression(node) {
            if (!node.properties || node.properties.length < MIN_OBJ_KEYS) return;
            const keys = getObjKeys(node);
            if (keys.length < MIN_OBJ_KEYS) return;
            const key = `${moduleName}::${keys.join(",")}`;
            if (!collectors.shapes.has(key)) collectors.shapes.set(key, []);
            collectors.shapes.get(key).push({ file, line: node.loc.start.line, keys });
        },
        CallExpression(node) {
            collectCall(node, moduleName, file, collectors);
        },
        BinaryExpression(node) {
            collectValidation(node, moduleName, file, collectors);
        },
    });
}

function collectFunc(node, moduleName, file, collectors) {
    if (!node.body) return;
    const hash = hashNode(node.body, 0);
    if (hash.length < MIN_FUNC_HASH_LEN) return;
    const name = (node.id && node.id.name) || getEnclosing(node);
    const key = `${moduleName}::${hash}`;
    if (!collectors.funcs.has(key)) collectors.funcs.set(key, []);
    collectors.funcs.get(key).push({ file, line: node.loc.start.line, name });
}

function collectCall(node, moduleName, file, collectors) {
    const callee = node.callee;
    if (!callee) return;
    if (callee.type === "MemberExpression" && callee.property && callee.property.name === "addEventListener") {
        const eventArg = node.arguments[0];
        const handlerArg = node.arguments[1];
        if (!eventArg || !handlerArg) return;
        const event = eventArg.type === "Literal" ? String(eventArg.value) : "dynamic";
        const hash = `${event}:${hashNode(handlerArg, 0)}`;
        const key = `${moduleName}::${hash}`;
        if (!collectors.handlers.has(key)) collectors.handlers.set(key, []);
        collectors.handlers.get(key).push({ file, line: node.loc.start.line, event });
        return;
    }
    if (callee.type === "Identifier" && (callee.name === "setTimeout" || callee.name === "setInterval")) {
        if (!node.arguments[1]) return;
        const hash = `${callee.name}:${hashNode(node.arguments[0], 0)}`;
        const key = `${moduleName}::${hash}`;
        if (!collectors.timers.has(key)) collectors.timers.set(key, []);
        collectors.timers.get(key).push({ file, line: node.loc.start.line, kind: callee.name });
    }
}

function collectValidation(node, moduleName, file, collectors) {
    if (node.operator !== "===" && node.operator !== "!==") return;
    if (!node.left || node.left.type !== "UnaryExpression" || node.left.operator !== "typeof") return;
    const hash = hashNode(node, 0);
    const key = `${moduleName}::${hash}`;
    if (!collectors.validations.has(key)) collectors.validations.set(key, []);
    collectors.validations.get(key).push({ file, line: node.loc.start.line });
}

function uniqueFiles(entries) {
    const set = new Set();
    for (const e of entries) set.add(e.file);
    return set.size;
}

function uniqueFileList(entries) {
    return [...new Set(entries.map(e => e.file))];
}

function report(type, group, moduleName, narrative, fix) {
    const files = uniqueFileList(group);
    if (files.length < 2) return false;
    const head = group[0];
    const others = files.slice(1);
    const shownRelated = others.slice(0, MAX_LOCATIONS_SHOWN);
    const overflow = others.length > MAX_LOCATIONS_SHOWN ? [`+${others.length - MAX_LOCATIONS_SHOWN} more file(s)`] : [];
    console.log(build4DReport({
        rule: `no-cross-file-duplication/${type}`,
        narrative,
        graph: {
            X: `${head.file} — ${type} duplicate spanning ${files.length} files (${group.length} occurrences)`,
            Y: `${group.length} call sites across ${files.length} files share the same value/shape`,
            Z: `no_separation (EliminateDuplicationViaSharing) — cross-file duplication type: ${type}`,
            W: `every duplicate is a divergence risk — one site changes, the rest drift`,
        },
        remediation: fix,
        trace: {
            file: head.file,
            line: String(head.line),
            col: "0",
            context: "module scope",
            module: moduleName,
            related: [...shownRelated, ...overflow],
        },
    }));
    return true;
}

function moduleOf(key) {
    return key.split("::")[0];
}

function analyze(collectors) {
    let violations = 0;
    const FIX = `Extract to a shared *-constants.ts / *-messages.ts / helper module. All files in the group must import from one source of truth — duplicate copies drift independently.`;

    for (const [key, group] of collectors.literals) {
        if (group.length < THRESHOLDS.literal) continue;
        if (uniqueFiles(group) < 2) continue;
        const val = JSON.stringify(group[0].value);
        const mod = moduleOf(key);
        const narrative = `Cross-file literal duplication. Value ${val} repeated ${group.length}× across ${uniqueFiles(group)} files in module [${mod}]. Inline literals diverge silently — extract to a named constant so every consumer reads the same value.`;
        if (report("literal", group, mod, narrative, FIX)) violations++;
    }
    for (const [key, group] of collectors.funcs) {
        if (group.length < THRESHOLDS.structural) continue;
        if (uniqueFiles(group) < 2) continue;
        const mod = moduleOf(key);
        const names = group.map(g => g.name).join(", ");
        const narrative = `Cross-file structural duplication. ${group.length} functions with identical body across ${uniqueFiles(group)} files: ${names}. Same logic in N places = N-1 forgotten patches when behavior changes.`;
        if (report("structural", group, mod, narrative, `Extract shared logic into a single parameterized helper. All callers import from one source.`)) violations++;
    }
    for (const [key, group] of collectors.conditions) {
        if (group.length < THRESHOLDS.logical) continue;
        if (uniqueFiles(group) < 2) continue;
        const mod = moduleOf(key);
        const narrative = `Cross-file logical duplication. Same if-condition repeated ${group.length}× across ${uniqueFiles(group)} files in module [${mod}]. Predicate logic must live in one place — guard functions are the standard pattern.`;
        if (report("logical", group, mod, narrative, `Extract to a named predicate: const isX = (...) => ...; import it in every consumer.`)) violations++;
    }
    for (const [key, group] of collectors.shapes) {
        if (group.length < THRESHOLDS.data) continue;
        if (uniqueFiles(group) < 2) continue;
        const mod = moduleOf(key);
        const keys = group[0].keys.join(", ");
        const narrative = `Cross-file data duplication. Object shape {${keys}} repeated ${group.length}× across ${uniqueFiles(group)} files in module [${mod}]. Repeated shapes signal a missing type/factory.`;
        if (report("data", group, mod, narrative, `Define a shared type/interface and factory. Replace inline literals with the typed constructor.`)) violations++;
    }
    for (const [key, group] of collectors.handlers) {
        if (group.length < THRESHOLDS.behavioral) continue;
        if (uniqueFiles(group) < 2) continue;
        const mod = moduleOf(key);
        const narrative = `Cross-file behavioral duplication. Same "${group[0].event}" handler pattern repeated ${group.length}× across ${uniqueFiles(group)} files in module [${mod}]. Identical handler logic = a missing shared function.`;
        if (report("behavioral", group, mod, narrative, `Create a shared handler function in a -helpers.ts or -events.ts and reference it from every listener registration.`)) violations++;
    }
    for (const [key, group] of collectors.validations) {
        if (group.length < THRESHOLDS.validation) continue;
        if (uniqueFiles(group) < 2) continue;
        const mod = moduleOf(key);
        const narrative = `Cross-file validation duplication. Same typeof check repeated ${group.length}× across ${uniqueFiles(group)} files in module [${mod}]. Type guards belong in one named function — drift means inconsistent validation.`;
        if (report("validation", group, mod, narrative, `Create a type guard: function isType(x): x is T { ... }. Import it everywhere you currently inline the check.`)) violations++;
    }
    for (const [key, group] of collectors.timers) {
        if (group.length < THRESHOLDS.temporal) continue;
        if (uniqueFiles(group) < 2) continue;
        const mod = moduleOf(key);
        const narrative = `Cross-file temporal duplication. Same ${group[0].kind} pattern repeated ${group.length}× across ${uniqueFiles(group)} files in module [${mod}]. Timer/scheduler patterns drift in subtle ways — centralize them.`;
        if (report("temporal", group, mod, narrative, `Extract to a parameterized scheduler helper. All timer registrations call the helper.`)) violations++;
    }

    return violations;
}

function main() {
    const arg = process.argv[2];
    const modules = arg ? { [arg]: pathsConfig.modules[arg] } : pathsConfig.modules;
    if (arg && !modules[arg]) {
        console.error(`unknown module: ${arg}`);
        process.exit(2);
    }

    const collectors = {
        literals: new Map(),
        funcs: new Map(),
        conditions: new Map(),
        shapes: new Map(),
        handlers: new Map(),
        validations: new Map(),
        timers: new Map(),
    };

    let totalFiles = 0;
    for (const [name, config] of Object.entries(modules)) {
        if (!config) continue;
        const files = collectFiles(name, config);
        totalFiles += files.length;
        for (const f of files) collectFromFile(f, config.language, name, collectors);
    }

    console.log(`${DIM}scanned ${totalFiles} files across ${Object.keys(modules).length} module(s)${RESET}`);
    console.log();

    const violations = analyze(collectors);

    if (violations === 0) {
        console.log(`${BOLD}✓ no cross-file duplication detected${RESET}`);
        process.exit(0);
    }
    console.log(`${RED}${BOLD}${violations} cross-file duplication group(s) found${RESET}`);
    process.exit(1);
}

main();
