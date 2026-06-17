import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import wawoff2 from "wawoff2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const ICONS_DIR = resolve(ROOT, "main/dashboard/src/icons");

const PATH_PRECISION = 3;
const RENDER_UNITS_PER_EM = 1000;

const FONTS = [
    { prefix: "bi", file: "public/fonts/bootstrap_icons.woff2", format: "woff2" },
    { prefix: "ti", file: "public/fonts/tabler/tabler-icons.woff2", format: "woff2" },
    { prefix: "mdi", file: "public/fonts/mdi/materialdesignicons-webfont.woff2", format: "woff2" },
    { prefix: "gi", file: "public/fonts/game-icons/rpgen-gameicons.woff2", format: "woff2" },
    { prefix: "ph", file: "public/fonts/phosphor/Phosphor.woff2", format: "woff2" },
    { prefix: "lu", file: "public/fonts/lucide/lucide.woff2", format: "woff2" },
    { prefix: "ra", file: "public/fonts/rpg-awesome/rpgawesome-webfont.woff2", format: "woff2" },
];

function bufferToArrayBuffer(buf) {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function loadFont(filePath, format) {
    const buffer = readFileSync(filePath);
    if (format === "woff2") {
        const ttf = await wawoff2.decompress(buffer);
        return opentype.parse(bufferToArrayBuffer(ttf));
    }
    return opentype.parse(bufferToArrayBuffer(buffer));
}

function extractGlyphPath(loaded, codepoint) {
    const glyph = loaded.charToGlyph(String.fromCodePoint(codepoint));
    if (!glyph) return null;
    const path = glyph.getPath(0, 0, RENDER_UNITS_PER_EM);
    const d = path.toPathData(PATH_PRECISION);
    if (typeof d !== "string" || d.length === 0) return null;
    return { d, advance: glyph.advanceWidth ?? 0 };
}

async function processFont(font) {
    const fontPath = resolve(ROOT, font.file);
    const registryPath = resolve(ICONS_DIR, `${font.prefix}.json`);
    const registry = JSON.parse(readFileSync(registryPath, "utf8"));
    const loaded = await loadFont(fontPath, font.format);
    const out = {};
    for (const [name, codepoint] of Object.entries(registry)) {
        const extracted = extractGlyphPath(loaded, codepoint);
        if (extracted !== null) out[name] = extracted;
    }
    const outPath = resolve(ICONS_DIR, `${font.prefix}-paths.json`);
    writeFileSync(outPath, JSON.stringify(out));
    return Object.keys(out).length;
}

let total = 0;
for (const font of FONTS) {
    try {
        const count = await processFont(font);
        total += count;
        console.log(`${font.prefix.padEnd(4)} ${String(count).padStart(6)} glyph paths`);
    } catch (err) {
        console.error(`${font.prefix.padEnd(4)} FAILED: ${err.message}`);
    }
}
console.log(`---\ntotal glyph paths extracted: ${total}`);
