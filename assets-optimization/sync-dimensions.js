#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeName } from "./lib/assets/asset-conversion.js";
import { uiLogger } from "./lib/notifications/ui-logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECTIONS_DIR = path.resolve(__dirname, "..", "main", "dashboard", "src", "data", "sections");
const STYLES_SECTIONS_DIR = path.resolve(__dirname, "..", "main", "dashboard", "src", "styles", "sections");
const STYLES_TOKENS_DIR = path.resolve(__dirname, "..", "main", "dashboard", "src", "styles", "tokens");
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const REM_PX = 16;
const RETINA_SCALE = 2;

function extractImageEntries(el, results) {
    if (el.key && el.content && el.content.src) {
        const { src, width, height } = el.content;
        if (width || height) {
            results.push({ key: el.key, src, width: width || null, height: height || null });
        }
    }
    if (el.children) {
        for (const child of el.children) {
            extractImageEntries(child, results);
        }
    }
}

function extractCssImageEntries(el, results) {
    if (el.key && el.content && el.content.src && !el.content.width && !el.content.height) {
        results.push({ key: el.key, src: el.content.src, classes: el.classes || [] });
    }
    if (el.children) {
        for (const child of el.children) {
            extractCssImageEntries(child, results);
        }
    }
}

function loadTokens() {
    const tokens = {};
    if (!fs.existsSync(STYLES_TOKENS_DIR)) return tokens;
    const files = fs.readdirSync(STYLES_TOKENS_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
        const json = JSON.parse(fs.readFileSync(path.join(STYLES_TOKENS_DIR, file), "utf8"));
        if (json.tokens) {
            Object.assign(tokens, json.tokens);
        }
    }
    return tokens;
}

function loadStyleSections() {
    const styles = {};
    if (!fs.existsSync(STYLES_SECTIONS_DIR)) return styles;
    const files = fs.readdirSync(STYLES_SECTIONS_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
        const json = JSON.parse(fs.readFileSync(path.join(STYLES_SECTIONS_DIR, file), "utf8"));
        for (const [key, rules] of Object.entries(json)) {
            styles[key] = rules;
        }
    }
    return styles;
}

function resolveVar(value, tokens) {
    if (!value.startsWith("var(--") || !value.endsWith(")")) return value;
    const tokenName = value.slice(6, -1);
    return tokens[tokenName] || value;
}

function splitTopLevelArgs(inner) {
    const args = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < inner.length; i++) {
        if (inner[i] === "(") depth++;
        else if (inner[i] === ")") depth--;
        else if (inner[i] === "," && depth === 0) {
            args.push(inner.slice(start, i).trim());
            start = i + 1;
        }
    }
    args.push(inner.slice(start).trim());
    return args;
}

function unwrapFunction(value) {
    const parenIdx = value.indexOf("(");
    if (parenIdx < 1 || !value.endsWith(")")) return null;
    const name = value.slice(0, parenIdx);
    const inner = value.slice(parenIdx + 1, -1);
    return { name, args: splitTopLevelArgs(inner) };
}

function extractClampMax(value) {
    const fn = unwrapFunction(value);
    if (!fn || fn.name !== "clamp" || fn.args.length < 3) return null;
    return fn.args[2];
}

function extractMinMax(value) {
    const fn = unwrapFunction(value);
    if (!fn) return null;
    if (fn.name === "min") {
        const pxValues = fn.args.map(toPx).filter((v) => v !== null);
        return pxValues.length > 0 ? Math.min(...pxValues) : null;
    }
    if (fn.name === "max") {
        const pxValues = fn.args.map(toPx).filter((v) => v !== null);
        return pxValues.length > 0 ? Math.max(...pxValues) : null;
    }
    return null;
}

function toPx(value) {
    if (value.endsWith("rem")) {
        const num = parseFloat(value.slice(0, -3));
        return Number.isFinite(num) ? Math.round(num * REM_PX) : null;
    }
    if (value.endsWith("px")) {
        const num = parseFloat(value.slice(0, -2));
        return Number.isFinite(num) ? Math.round(num) : null;
    }
    return null;
}

function resolveDeep(rawValue, tokens, depth = 0) {
    if (depth > 5) return rawValue;
    const resolved = resolveVar(rawValue, tokens);
    if (resolved === rawValue) return resolved;
    return resolveDeep(resolved, tokens, depth + 1);
}

function resolveMaxPx(rawValue, tokens) {
    const value = resolveDeep(rawValue, tokens);

    const clampMax = extractClampMax(value);
    if (clampMax) return toPx(clampMax);

    const minMax = extractMinMax(value);
    if (minMax !== null) return minMax;

    return toPx(value);
}

function extractSelectorClasses(selector) {
    const classes = [];
    let i = 0;
    while (i < selector.length) {
        if (selector[i] === ".") {
            let end = i + 1;
            while (end < selector.length && selector[end] !== "." && selector[end] !== " " && selector[end] !== ":" && selector[end] !== "[") {
                end++;
            }
            classes.push(selector.slice(i + 1, end));
            i = end;
        } else {
            i++;
        }
    }
    return classes;
}

function findCssDimensions(entry, styles, tokens) {
    let cssWidth = null;
    let cssHeight = null;

    for (const styleBlock of Object.values(styles)) {
        for (const [selector, props] of Object.entries(styleBlock)) {
            const isImgRule = selector.endsWith(" img");
            const isDirectRule = !selector.includes(" ");

            if (!isImgRule && !isDirectRule) continue;

            const selectorBase = isImgRule ? selector.slice(0, -4).trim() : selector;
            const selectorClasses = extractSelectorClasses(selectorBase);

            if (selectorClasses.length === 0) continue;
            if (!selectorClasses.every((sc) => entry.classes.includes(sc))) continue;

            if (props.width && props.width !== "auto") {
                const px = resolveMaxPx(props.width, tokens);
                if (px) cssWidth = px;
            }
            if (props.height && props.height !== "auto") {
                const px = resolveMaxPx(props.height, tokens);
                if (px) cssHeight = px;
            }
        }
    }

    if (!cssWidth && !cssHeight) return null;
    return { width: cssWidth, height: cssHeight };
}

function computeTargetDimensions(cssWidth, cssHeight, imgWidth, imgHeight) {
    const scaledW = cssWidth ? cssWidth * RETINA_SCALE : null;
    const scaledH = cssHeight ? cssHeight * RETINA_SCALE : null;
    const aspect = imgWidth / imgHeight;

    let targetW = null;
    let targetH = null;

    if (scaledW && scaledH) {
        targetW = scaledW;
        targetH = scaledH;
    } else if (scaledW) {
        targetW = scaledW;
        targetH = Math.round(scaledW / aspect);
    } else if (scaledH) {
        targetW = Math.round(scaledH * aspect);
        targetH = scaledH;
    } else {
        return null;
    }

    if (targetW >= imgWidth && targetH >= imgHeight) return null;

    return { width: targetW, height: targetH };
}

function stripDimensionTags(basename) {
    let result = "";
    let i = 0;
    while (i < basename.length) {
        if (basename[i] === "_" && i + 1 < basename.length && (basename[i + 1] === "w" || basename[i + 1] === "h")) {
            let end = i + 2;
            while (end < basename.length && basename[end] >= "0" && basename[end] <= "9") {
                end++;
            }
            if (end > i + 2) {
                i = end;
                continue;
            }
        }
        result += basename[i];
        i++;
    }
    return result;
}

function buildDimensionSuffix(width, height) {
    let suffix = "";
    if (width) suffix += `_w${width}`;
    if (height) suffix += `_h${height}`;
    return suffix;
}

function renameAsset(entry, PUBLIC, sectionFiles) {
    const srcPath = entry.src.startsWith("/") ? entry.src.slice(1) : entry.src;
    const fullPath = path.join(PUBLIC, srcPath);
    const dir = path.dirname(fullPath);
    const currentName = path.basename(fullPath);

    if (!fs.existsSync(dir)) {
        uiLogger.force(`  ⚠ Directory not found: ${dir}`);
        return { renamed: false, updated: false };
    }

    const ext = path.extname(currentName);
    const base = currentName.slice(0, currentName.length - ext.length);
    const cleanBase = stripDimensionTags(base);
    const suffix = buildDimensionSuffix(entry.width, entry.height);
    const targetName = `${cleanBase}${suffix}${ext}`;
    const normalizedTarget = normalizeName(targetName);

    const existingFiles = fs.readdirSync(dir);
    const currentFile = existingFiles.find((f) => f === currentName)
        || existingFiles.find((f) => normalizeName(f) === normalizeName(currentName))
        || existingFiles.find((f) => stripDimensionTags(normalizeName(f).replace(path.extname(f), "")) === cleanBase.toLowerCase());

    if (!currentFile) {
        uiLogger.force(`  ⚠ Asset not found for ${entry.key}: ${currentName}`);
        return { renamed: false, updated: false };
    }

    const currentFullPath = path.join(dir, currentFile);
    const targetFullPath = path.join(dir, normalizedTarget);
    let renamed = false;
    let updated = false;

    if (currentFile !== normalizedTarget) {
        fs.renameSync(currentFullPath, targetFullPath);
        uiLogger.force(`  ${currentFile} → ${normalizedTarget}`);
        renamed = true;
    }

    const newSrc = "/" + path.relative(PUBLIC, targetFullPath).replaceAll("\\", "/");
    if (newSrc !== entry.src) {
        updateSectionJson(entry.src, newSrc, sectionFiles);
        updated = true;
    }

    return { renamed, updated };
}

async function main() {
    uiLogger.banner("ASSET DIMENSION SYNC", {
        Mode: "Reads section definitions + CSS tokens, renames public assets to match declared dimensions",
    });

    const sectionFiles = fs.readdirSync(SECTIONS_DIR).filter((f) => f.endsWith(".json"));
    const explicitEntries = [];
    const cssEntries = [];

    for (const file of sectionFiles) {
        const json = JSON.parse(fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8"));
        if (json.root) {
            extractImageEntries(json.root, explicitEntries);
            extractCssImageEntries(json.root, cssEntries);
        }
    }

    let totalRenamed = 0;
    let totalUpdated = 0;

    if (explicitEntries.length > 0) {
        uiLogger.force(`Found ${explicitEntries.length} image entries with explicit dimensions`);
        for (const entry of explicitEntries) {
            const result = renameAsset(entry, PUBLIC_DIR, sectionFiles);
            if (result.renamed) totalRenamed++;
            if (result.updated) totalUpdated++;
        }
    }

    if (cssEntries.length > 0) {
        uiLogger.force(`Found ${cssEntries.length} image entries with CSS-only sizing`);

        const tokens = loadTokens();
        const styles = loadStyleSections();

        let sharp = null;
        try {
            const sharpModule = await import("sharp");
            sharp = sharpModule.default;
        } catch {
            uiLogger.force("  ⚠ sharp not available, skipping CSS-traced dimension detection");
        }

        if (sharp) {
            for (const entry of cssEntries) {
                const cssDims = findCssDimensions(entry, styles, tokens);
                if (!cssDims) {
                    uiLogger.force(`  ⚠ No CSS dimensions resolved for ${entry.key}`);
                    continue;
                }

                const srcPath = entry.src.startsWith("/") ? entry.src.slice(1) : entry.src;
                const fullPath = path.join(PUBLIC_DIR, srcPath);

                const existingDir = path.dirname(fullPath);
                const existingName = path.basename(fullPath);
                const existingFiles = fs.existsSync(existingDir) ? fs.readdirSync(existingDir) : [];
                const match = existingFiles.find((f) => f === existingName)
                    || existingFiles.find((f) => normalizeName(f) === normalizeName(existingName))
                    || existingFiles.find((f) => {
                        const cleanF = stripDimensionTags(normalizeName(f).replace(path.extname(f), ""));
                        const cleanE = stripDimensionTags(existingName.replace(path.extname(existingName), "")).toLowerCase();
                        return cleanF === cleanE;
                    });

                if (!match) {
                    uiLogger.force(`  ⚠ Asset not found for ${entry.key}: ${existingName}`);
                    continue;
                }

                const resolvedPath = path.join(existingDir, match);
                let metadata;
                try {
                    metadata = await sharp(resolvedPath).metadata();
                } catch (err) {
                    uiLogger.force(`  ⚠ Cannot read image metadata for ${match}: ${err.message}`);
                    continue;
                }

                const target = computeTargetDimensions(cssDims.width, cssDims.height, metadata.width, metadata.height);
                if (!target) continue;

                uiLogger.force(`  ${entry.key}: CSS max ${cssDims.width || "auto"}x${cssDims.height || "auto"}px → target ${target.width}x${target.height}px (2x retina)`);

                const renameEntry = { key: entry.key, src: entry.src, width: target.width, height: target.height };
                const result = renameAsset(renameEntry, PUBLIC_DIR, sectionFiles);
                if (result.renamed) totalRenamed++;
                if (result.updated) totalUpdated++;
            }
        }
    }

    if (totalRenamed === 0 && totalUpdated === 0) {
        uiLogger.force("\nAll assets already in sync");
    } else {
        uiLogger.force(`\nRenamed ${totalRenamed} files, updated ${totalUpdated} src references`);
    }
}

function updateSectionJson(oldSrc, newSrc, sectionFiles) {
    for (const file of sectionFiles) {
        const filePath = path.join(SECTIONS_DIR, file);
        let content = fs.readFileSync(filePath, "utf8");

        if (content.includes(oldSrc)) {
            content = content.replaceAll(oldSrc, newSrc);
            fs.writeFileSync(filePath, content, "utf8");
        }
    }
}

main();
