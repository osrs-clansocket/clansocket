#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseTs } from "@typescript-eslint/typescript-estree";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_ROOTS = [
    path.join(APP_ROOT, "main", "dashboard", "src"),
    path.join(APP_ROOT, "main", "server", "src"),
    path.join(APP_ROOT, "main", "discord", "src"),
];
const OUT_PATH = path.join(APP_ROOT, ".lint-reports", "token-corpus.json");
const EXCLUDE_DIRS = new Set(["node_modules", "dist", ".lint-reports", ".script-backups", ".git", "build"]);

function walkTs(root, out) {
    if (!fs.existsSync(root)) return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const p = path.join(root, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDE_DIRS.has(entry.name)) continue;
            walkTs(p, out);
            continue;
        }
        if (!entry.isFile()) continue;
        if (entry.name.endsWith(".d.ts")) continue;
        if (entry.name.endsWith(".test.ts")) continue;
        if (entry.name.endsWith(".ts")) out.push(p);
    }
}

function tokenize(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .split(/[\s_-]+/)
        .filter((t) => t.length > 0)
        .map((t) => t.toLowerCase());
}

function collectDeclarations(programBody) {
    const out = [];
    for (const node of programBody) {
        const target = node.type === "ExportNamedDeclaration" ? node.declaration : node;
        if (!target) continue;
        if (target.type === "FunctionDeclaration" && target.id) out.push(target.id.name);
        else if (target.type === "ClassDeclaration" && target.id) out.push(target.id.name);
        else if (target.type === "TSInterfaceDeclaration" && target.id) out.push(target.id.name);
        else if (target.type === "TSTypeAliasDeclaration" && target.id) out.push(target.id.name);
        else if (target.type === "TSEnumDeclaration" && target.id) out.push(target.id.name);
        else if (target.type === "VariableDeclaration") {
            for (const d of target.declarations) {
                if (d.id && d.id.type === "Identifier" && d.init) {
                    const k = d.init.type;
                    if (
                        k === "ArrowFunctionExpression" ||
                        k === "FunctionExpression" ||
                        k === "ObjectExpression" ||
                        k === "ClassExpression"
                    ) {
                        out.push(d.id.name);
                    }
                }
            }
        }
    }
    return out;
}

function main() {
    const files = [];
    for (const root of SOURCE_ROOTS) walkTs(root, files);
    const tokenFileCount = Object.create(null);
    let totalIdentifiers = 0;
    let parseFailures = 0;
    for (const file of files) {
        let source;
        try {
            source = fs.readFileSync(file, "utf-8");
        } catch {
            continue;
        }
        let ast;
        try {
            ast = parseTs(source, { jsx: false, loc: false, range: false, errorOnUnknownASTType: false });
        } catch {
            parseFailures++;
            continue;
        }
        const decls = collectDeclarations(ast.body);
        totalIdentifiers += decls.length;
        const tokensInThisFile = new Set();
        for (const name of decls) for (const t of tokenize(name)) tokensInThisFile.add(t);
        for (const t of tokensInThisFile) {
            tokenFileCount[t] = (tokenFileCount[t] || 0) + 1;
        }
    }
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    const corpus = {
        version: 1,
        generatedAt: Date.now(),
        totalFiles: files.length,
        totalIdentifiers,
        parseFailures,
        uniqueTokens: Object.keys(tokenFileCount).length,
        tokenFileCount,
    };
    fs.writeFileSync(OUT_PATH, JSON.stringify(corpus, null, 2), "utf-8");
    const failureNote = parseFailures > 0 ? ` (${parseFailures} parse failures)` : "";
    console.log(
        `[token-corpus] ${files.length} files, ${totalIdentifiers} identifiers, ${Object.keys(tokenFileCount).length} unique tokens${failureNote}`,
    );
}

main();
