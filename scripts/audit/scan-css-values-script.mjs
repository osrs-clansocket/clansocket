#!/usr/bin/env node
/**
 * Scan all dashboard CSS files; collect unique values per property family.
 * Reports raw literals (no var()) so we can size the generic scale.
 */
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "main", "dashboard", "src", "styles");
const TARGETS = {
    "font-size": new Map(),
    "padding-y": new Map(),
    "padding-x": new Map(),
    gap: new Map(),
    "line-height": new Map(),
    "letter-spacing": new Map(),
    "border-radius": new Map(),
    "z-index": new Map(),
    opacity: new Map(),
    blur: new Map(),
    width: new Map(),
    height: new Map(),
    "box-shadow": new Map(),
};

function walkDir(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(full, out);
        else if (entry.name.endsWith(".css")) out.push(full);
    }
}

function bump(map, key, file) {
    if (!map.has(key)) map.set(key, { count: 0, files: new Set() });
    const slot = map.get(key);
    slot.count += 1;
    slot.files.add(path.relative(ROOT, file));
}

const LENGTH_UNITS = ["rem", "px", "em", "vw", "vh", "dvh", "dvw", "%", "ch", "fr"];

function isLengthNode(node) {
    if (node.type !== "word") return false;
    const parsed = valueParser.unit(node.value);
    if (!parsed) return false;
    if (parsed.unit === "") return parsed.number === "0";
    return LENGTH_UNITS.includes(parsed.unit);
}

function valuesFromDecl(decl) {
    const parsed = valueParser(decl.value);
    const tokens = [];
    for (const node of parsed.nodes) {
        if (node.type === "function" && node.value === "var") return [];
        if (node.type === "function" && node.value === "calc") return [];
        if (isLengthNode(node)) tokens.push(node.value);
    }
    return tokens;
}

function pureNumberTokens(decl) {
    const parsed = valueParser(decl.value);
    const out = [];
    for (const node of parsed.nodes) {
        if (node.type === "function" && node.value === "var") return [];
        if (node.type === "function" && node.value === "calc") return [];
        if (node.type !== "word") continue;
        const u = valueParser.unit(node.value);
        if (!u || u.unit !== "") continue;
        out.push(node.value);
    }
    return out;
}

function blurArgsFromFilter(decl) {
    const parsed = valueParser(decl.value);
    const out = [];
    parsed.walk((node) => {
        if (node.type === "function" && node.value === "blur") {
            for (const arg of node.nodes) {
                if (arg.type === "word") out.push(arg.value);
            }
            return false;
        }
        return undefined;
    });
    return out;
}

const files = [];
walkDir(ROOT, files);

for (const file of files) {
    const css = fs.readFileSync(file, "utf8");
    const root = postcss.parse(css);
    root.walkDecls((decl) => {
        const p = decl.prop;
        const raw = decl.value.trim();
        if (raw.includes("var(")) return;
        if (p === "z-index" || p === "opacity") {
            pureNumberTokens(decl).forEach((t) => bump(TARGETS[p], t, file));
        }
        if (p === "filter" || p === "backdrop-filter") {
            blurArgsFromFilter(decl).forEach((t) => bump(TARGETS.blur, t, file));
        }
        if (p === "box-shadow") {
            // Record the raw value as-is when it doesn't start with var().
            if (!raw.startsWith("var(")) bump(TARGETS["box-shadow"], raw, file);
        }
        if (p === "width" || p === "min-width" || p === "max-width") {
            const t = valuesFromDecl(decl);
            t.forEach((v) => bump(TARGETS.width, v, file));
        }
        if (p === "height" || p === "min-height" || p === "max-height") {
            const t = valuesFromDecl(decl);
            t.forEach((v) => bump(TARGETS.height, v, file));
        }

        const tokens = valuesFromDecl(decl);
        if (tokens.length === 0) return;

        if (p === "font-size") tokens.forEach((t) => bump(TARGETS["font-size"], t, file));
        else if (p === "line-height") tokens.forEach((t) => bump(TARGETS["line-height"], t, file));
        else if (p === "letter-spacing") tokens.forEach((t) => bump(TARGETS["letter-spacing"], t, file));
        else if (p === "border-radius") tokens.forEach((t) => bump(TARGETS["border-radius"], t, file));
        else if (p === "gap" || p === "row-gap" || p === "column-gap")
            tokens.forEach((t) => bump(TARGETS.gap, t, file));
        else if (p.startsWith("padding")) {
            if (p === "padding") {
                if (tokens.length >= 1) bump(TARGETS["padding-y"], tokens[0], file);
                if (tokens.length >= 2) bump(TARGETS["padding-x"], tokens[1], file);
                else if (tokens.length === 1) bump(TARGETS["padding-x"], tokens[0], file);
            } else if (p.includes("block") || p.includes("top") || p.includes("bottom")) {
                tokens.forEach((t) => bump(TARGETS["padding-y"], t, file));
            } else if (p.includes("inline") || p.includes("left") || p.includes("right")) {
                tokens.forEach((t) => bump(TARGETS["padding-x"], t, file));
            }
        }

    });
}

function sortNumeric(a, b) {
    const na = parseFloat(a[0]);
    const nb = parseFloat(b[0]);
    if (isNaN(na) && isNaN(nb)) return a[0].localeCompare(b[0]);
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
}

for (const [family, map] of Object.entries(TARGETS)) {
    console.log(`\n=== ${family} (${map.size} unique) ===`);
    const rows = [...map.entries()].sort(sortNumeric);
    for (const [val, info] of rows) {
        console.log(`  ${val.padEnd(12)} × ${String(info.count).padStart(4)}   in ${info.files.size} files`);
    }
}
