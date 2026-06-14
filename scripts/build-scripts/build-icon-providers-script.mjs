import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const CACHE_DIR = resolve(ROOT, ".cache", "icon");
const STYLES_DIR = resolve(ROOT, "main/dashboard/src/styles/auto-gen/icons");
const JSON_DIR = resolve(ROOT, "main/dashboard/src/data/icons");
const PUBLIC_FONTS_DIR = resolve(ROOT, "public/fonts");

mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(STYLES_DIR, { recursive: true });
mkdirSync(JSON_DIR, { recursive: true });
mkdirSync(PUBLIC_FONTS_DIR, { recursive: true });

const CDN = "https://cdn.jsdelivr.net/npm";

const PROVIDERS = [
    {
        prefix: "ti",
        baseClass: "ti",
        cssUrl: `${CDN}/@tabler/icons-webfont@latest/dist/tabler-icons.css`,
        fonts: { "tabler-icons.woff2": `${CDN}/@tabler/icons-webfont@latest/dist/fonts/tabler-icons.woff2` },
        selectorPrefix: ".ti-",
        fontFamily: "tabler-icons",
        webFontDir: "/fonts/tabler/",
        publicDir: "tabler",
    },
    {
        prefix: "ph",
        baseClass: "ph",
        cssUrl: `${CDN}/@phosphor-icons/web@latest/src/regular/style.css`,
        fonts: { "Phosphor.woff2": `${CDN}/@phosphor-icons/web@latest/src/regular/Phosphor.woff2` },
        selectorPrefix: ".ph-",
        fontFamily: "Phosphor",
        webFontDir: "/fonts/phosphor/",
        publicDir: "phosphor",
    },
    {
        prefix: "lu",
        baseClass: "lucide",
        cssUrl: `${CDN}/lucide-static@latest/font/lucide.css`,
        fonts: { "lucide.woff2": `${CDN}/lucide-static@latest/font/lucide.woff2` },
        selectorPrefix: ".icon-",
        fontFamily: "lucide",
        webFontDir: "/fonts/lucide/",
        publicDir: "lucide",
    },
    {
        prefix: "mdi",
        baseClass: "mdi",
        cssUrl: `${CDN}/@mdi/font@latest/css/materialdesignicons.min.css`,
        fonts: { "materialdesignicons-webfont.woff2": `${CDN}/@mdi/font@latest/fonts/materialdesignicons-webfont.woff2` },
        selectorPrefix: ".mdi-",
        fontFamily: "Material Design Icons",
        webFontDir: "/fonts/mdi/",
        publicDir: "mdi",
    },
    {
        prefix: "gi",
        baseClass: "gi",
        cssUrl: `${CDN}/@rolodromo/gameicons-webfont@latest/css/rpgen-gameicons.css`,
        fonts: { "rpgen-gameicons.woff2": `${CDN}/@rolodromo/gameicons-webfont@latest/fonts/rpgen-gameicons.woff2` },
        selectorPrefix: ".gi-",
        fontFamily: "rpgen-gameicons",
        webFontDir: "/fonts/game-icons/",
        publicDir: "game-icons",
    },
    {
        prefix: "ra",
        baseClass: "ra",
        cssUrl: `${CDN}/rpg-awesome@latest/css/rpg-awesome.css`,
        fonts: {
            "rpgawesome-webfont.woff": `${CDN}/rpg-awesome@latest/fonts/rpgawesome-webfont.woff`,
            "rpgawesome-webfont.ttf": `${CDN}/rpg-awesome@latest/fonts/rpgawesome-webfont.ttf`,
        },
        selectorPrefix: ".ra-",
        fontFamily: "RPGAwesome",
        webFontDir: "/fonts/rpg-awesome/",
        publicDir: "rpg-awesome",
        skipNames: ["lg", "2x", "3x", "4x", "5x", "fw", "ul", "li", "border", "pull-left", "pull-right", "spin", "rotate-90", "rotate-180", "rotate-270", "flip-horizontal", "flip-vertical", "inverse", "stack", "stack-1x", "stack-2x"],
    },
];

async function downloadFile(url, destPath) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    if (destPath.endsWith(".css")) {
        const text = await res.text();
        writeFileSync(destPath, text);
        return;
    }
    await pipeline(res.body, createWriteStream(destPath));
}

function isValidGlyphName(s) {
    if (!s) return false;
    for (const ch of s) {
        const code = ch.charCodeAt(0);
        const isLower = code >= 97 && code <= 122;
        const isUpper = code >= 65 && code <= 90;
        const isDigit = code >= 48 && code <= 57;
        const isDash = ch === "-";
        if (!isLower && !isUpper && !isDigit && !isDash) return false;
    }
    return true;
}

function extractGlyphs(raw, prefix, skipNames) {
    const skip = new Set(skipNames ?? []);
    const glyphs = {};
    const blocks = raw.split("}");
    for (const block of blocks) {
        let cursor = 0;
        while (cursor < block.length) {
            const selIdx = block.indexOf(prefix, cursor);
            if (selIdx < 0) break;
            cursor = selIdx + prefix.length;
            const after = block.slice(cursor);
            const stopChars = [":", ",", " ", ".", "{", "\n", "\t", "\r"];
            let endIdx = after.length;
            for (const ch of stopChars) {
                const i = after.indexOf(ch);
                if (i >= 0 && i < endIdx) endIdx = i;
            }
            const name = after.slice(0, endIdx);
            if (!isValidGlyphName(name)) continue;
            if (skip.has(name)) continue;
            const contentIdx = block.indexOf("content:");
            if (contentIdx < 0) continue;
            let quoteStart = -1;
            let quoteChar = "";
            for (let i = contentIdx; i < block.length; i += 1) {
                if (block[i] === "\"" || block[i] === "'") { quoteStart = i; quoteChar = block[i]; break; }
            }
            if (quoteStart < 0) continue;
            const quoteEnd = block.indexOf(quoteChar, quoteStart + 1);
            if (quoteEnd < 0) continue;
            const inner = block.slice(quoteStart + 1, quoteEnd);
            let codepoint;
            if (inner.startsWith("\\")) codepoint = parseInt(inner.slice(1), 16);
            else if (inner.length >= 1) codepoint = inner.codePointAt(0);
            else continue;
            if (!Number.isFinite(codepoint)) continue;
            if (glyphs[name] === undefined) glyphs[name] = codepoint;
        }
    }
    return glyphs;
}

function vendorCss(provider, glyphs) {
    const { webFontDir, fontFamily, baseClass, prefix, fonts } = provider;
    const srcEntries = [];
    for (const name of Object.keys(fonts)) {
        const lower = name.toLowerCase();
        const format = lower.endsWith(".woff2") ? "woff2" : lower.endsWith(".woff") ? "woff" : lower.endsWith(".ttf") ? "truetype" : lower.endsWith(".otf") ? "opentype" : "woff2";
        srcEntries.push(`url("${webFontDir}${name}") format("${format}")`);
    }
    const lines = [
        `/* generated by scripts/build-scripts/build-icon-providers-script.mjs — do not edit */`,
        `@font-face {`,
        `    font-family: "${fontFamily}";`,
        `    src: ${srcEntries.join(", ")};`,
        `    font-weight: normal;`,
        `    font-style: normal;`,
        `    font-display: swap;`,
        `}`,
        `.${baseClass} {`,
        `    font-family: "${fontFamily}", sans-serif;`,
        `    font-style: normal;`,
        `    font-weight: normal;`,
        `    font-variant: normal;`,
        `    text-transform: none;`,
        `    line-height: 1;`,
        `    speak: never;`,
        `    display: inline-block;`,
        `    -webkit-font-smoothing: antialiased;`,
        `    -moz-osx-font-smoothing: grayscale;`,
        `}`,
    ];
    for (const [name, codepoint] of Object.entries(glyphs)) {
        lines.push(`.${prefix}-${name}::before { content: "\\${codepoint.toString(16)}"; }`);
    }
    return lines.join("\n");
}

async function processProvider(provider) {
    const cachedCss = resolve(CACHE_DIR, `${provider.prefix}-raw.css`);
    await downloadFile(provider.cssUrl, cachedCss);
    const fontTargetDir = resolve(PUBLIC_FONTS_DIR, provider.publicDir);
    mkdirSync(fontTargetDir, { recursive: true });
    for (const [fileName, url] of Object.entries(provider.fonts)) {
        await downloadFile(url, resolve(fontTargetDir, fileName));
    }
    const raw = readFileSync(cachedCss, "utf8");
    const glyphs = extractGlyphs(raw, provider.selectorPrefix, provider.skipNames);
    writeFileSync(resolve(JSON_DIR, `${provider.prefix}.json`), JSON.stringify(glyphs, null, 0));
    writeFileSync(resolve(STYLES_DIR, `${provider.prefix}.css`), vendorCss(provider, glyphs));
    return Object.keys(glyphs).length;
}

let total = 0;
for (const provider of PROVIDERS) {
    try {
        const count = await processProvider(provider);
        total += count;
        console.log(`${provider.prefix.padEnd(4)} ${String(count).padStart(6)} glyphs (${provider.cssUrl})`);
    } catch (err) {
        console.error(`${provider.prefix.padEnd(4)} FAILED: ${err.message}`);
    }
}
console.log(`---\ntotal glyphs across new providers: ${total}`);
