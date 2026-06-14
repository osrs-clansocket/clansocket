import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..", "..");
const DIST_DIR = path.join(APP_ROOT, "dist");
const PUBLIC_DIR = path.join(APP_ROOT, "public");

const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);
const QUOTES = new Set(['"', "'"]);

async function collectCssFiles(dir, acc) {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            await collectCssFiles(full, acc);
        } else if (e.isFile() && e.name.endsWith(".css")) {
            acc.push(full);
        }
    }
}

function extractRootedUrls(cssText) {
    const out = [];
    let i = 0;
    while (i < cssText.length) {
        const start = cssText.indexOf("url(", i);
        if (start === -1) break;
        let cursor = start + 4;
        while (cursor < cssText.length && WHITESPACE.has(cssText[cursor])) cursor++;
        let quote = "";
        if (QUOTES.has(cssText[cursor])) {
            quote = cssText[cursor];
            cursor++;
        }
        const end = quote ? cssText.indexOf(quote, cursor) : cssText.indexOf(")", cursor);
        if (end === -1) {
            i = cursor;
            continue;
        }
        const url = cssText.slice(cursor, end).trim();
        if (url.startsWith("/") && !url.startsWith("//")) out.push(url);
        i = end + 1;
    }
    return out;
}

function publicFsPath(rootedUrl) {
    let p = rootedUrl.startsWith("/") ? rootedUrl.slice(1) : rootedUrl;
    const qIdx = p.indexOf("?");
    if (qIdx !== -1) p = p.slice(0, qIdx);
    const hIdx = p.indexOf("#");
    if (hIdx !== -1) p = p.slice(0, hIdx);
    return path.join(PUBLIC_DIR, p);
}

async function main() {
    if (!existsSync(DIST_DIR)) {
        console.error(`verify-fonts: dist/ not found at ${DIST_DIR}`);
        process.exit(1);
    }
    if (!existsSync(PUBLIC_DIR)) {
        console.error(`verify-fonts: public/ not found at ${PUBLIC_DIR}`);
        process.exit(1);
    }
    const cssFiles = [];
    await collectCssFiles(DIST_DIR, cssFiles);
    const missing = new Map();
    let totalRefs = 0;
    for (const cssFile of cssFiles) {
        const text = await readFile(cssFile, "utf8");
        const urls = extractRootedUrls(text);
        totalRefs += urls.length;
        for (const url of urls) {
            const fsPath = publicFsPath(url);
            if (existsSync(fsPath)) continue;
            const refs = missing.get(url) ?? [];
            refs.push(path.relative(APP_ROOT, cssFile));
            missing.set(url, refs);
        }
    }
    if (missing.size === 0) {
        console.log(`verify-fonts: ${cssFiles.length} CSS file(s) scanned, ${totalRefs} rooted url() reference(s) all resolve in public/`);
        return;
    }
    console.error("verify-fonts: MISSING public/ assets referenced from dist CSS:");
    for (const [url, refs] of missing) {
        console.error(`  ${url}`);
        for (const ref of refs) console.error(`    ← ${ref}`);
    }
    process.exit(1);
}

void main();
