#!/usr/bin/env node
// Convert OSRS world-map tile PNGs to WebP at multiple LOD (level-of-detail)
// resolutions: 256, 128, 64, 32 px per region. Each LOD goes through the
// same single-pass verify+fix pipeline:
//   1. Read PNG into RGBA buffer
//   2. Set alpha=0 on all #000000 source pixels (black filler removal)
//   3. Resize the cleaned RGBA buffer to the target LOD size
//   4. Encode as lossy WebP q90
//   5. Decode the encoded result + re-check for residual opaque #000000 (drift)
//   6. If drift found, re-encode the cleaned+resized buffer as lossless WebP
//   7. Write the final buffer to disk
//   8. Delete the source PNG (after ALL LODs succeed for that region)
//
// Output structure:
//   public/resources/osrs/image_world_map/tiles/<plane>/<size>/<region>.webp
//
// Painter selects LOD per current view scale (see clan-map-paint.ts:pickLod).
//
// Run: node assets-optimization/convert-map-tiles.mjs
import sharp from "sharp";
import { promises as fs, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = resolve(HERE, "..", "..", "extracted-cache-assets", "map", "tiles");
const DST_ROOT = resolve(HERE, "..", "public", "resources", "osrs", "image_world_map", "tiles");
const CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 8));
const LOD_SIZES = [256, 128, 64, 32];
const LOSSY_OPTS = { quality: 90, effort: 6 };
const LOSSLESS_OPTS = { lossless: true, effort: 4 };

async function enumeratePngs() {
    const out = [];
    const planes = await fs.readdir(SRC_ROOT, { withFileTypes: true });
    for (const p of planes) {
        if (!p.isDirectory()) continue;
        const planeDir = join(SRC_ROOT, p.name);
        const files = await fs.readdir(planeDir, { withFileTypes: true });
        for (const f of files) {
            if (f.isFile() && f.name.endsWith(".png")) out.push({ srcPath: join(planeDir, f.name), planeName: p.name, regionId: f.name.replace(/\.png$/, "") });
        }
    }
    return out;
}

async function ensureLodDirs(planeName) {
    for (const size of LOD_SIZES) {
        await fs.mkdir(join(DST_ROOT, planeName, String(size)), { recursive: true });
    }
}

function cleanBlack(rgba) {
    let count = 0;
    for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] === 0 && rgba[i + 1] === 0 && rgba[i + 2] === 0) {
            rgba[i + 3] = 0;
            count++;
        }
    }
    return count;
}

function hasOpaqueBlack(rgba) {
    for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] === 0 && rgba[i + 1] === 0 && rgba[i + 2] === 0 && rgba[i + 3] !== 0) return true;
    }
    return false;
}

async function encodeLod(cleanedRgba, srcW, srcH, targetSize) {
    const rawIn = { raw: { width: srcW, height: srcH, channels: 4 } };
    const resized = await sharp(cleanedRgba, rawIn).resize(targetSize, targetSize, { kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
    const resizedBuf = resized.data;
    const resizedInfo = resized.info;
    cleanBlack(resizedBuf);
    const rawResized = { raw: { width: resizedInfo.width, height: resizedInfo.height, channels: 4 } };
    const lossyBuf = await sharp(resizedBuf, rawResized).webp(LOSSY_OPTS).toBuffer();
    const verify = await sharp(lossyBuf).ensureAlpha().raw().toBuffer();
    if (hasOpaqueBlack(verify)) {
        return sharp(resizedBuf, rawResized).webp(LOSSLESS_OPTS).toBuffer();
    }
    return lossyBuf;
}

async function convertTile(entry) {
    await ensureLodDirs(entry.planeName);
    const input = await fs.readFile(entry.srcPath);
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleanedCount = cleanBlack(data);

    let totalBytes = 0;
    for (const size of LOD_SIZES) {
        const buf = await encodeLod(data, info.width, info.height, size);
        if (buf.length > 0) {
            const outPath = join(DST_ROOT, entry.planeName, String(size), `${entry.regionId}.webp`);
            await fs.writeFile(outPath, buf);
            totalBytes += buf.length;
        }
    }
    return { cleanedCount, totalBytes };
}

async function processInBatches(items, batchSize, fn) {
    let done = 0;
    let totalCleaned = 0;
    let totalBytes = 0;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(fn));
        for (const r of results) {
            totalCleaned += r.cleanedCount;
            totalBytes += r.totalBytes;
        }
        done += batch.length;
        process.stdout.write(`\r  ${done}/${items.length} tiles converted (${LOD_SIZES.length} LODs each)`);
    }
    process.stdout.write("\n");
    return { totalCleaned, totalBytes };
}

async function dirSize(dir) {
    if (!existsSync(dir)) return 0;
    let total = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = join(dir, e.name);
        if (e.isDirectory()) total += await dirSize(full);
        else if (e.isFile()) total += (await fs.stat(full)).size;
    }
    return total;
}

function fmtMb(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

async function main() {
    if (!existsSync(SRC_ROOT)) {
        console.error(`Source not found: ${SRC_ROOT}`);
        process.exit(1);
    }
    await fs.mkdir(DST_ROOT, { recursive: true });
    console.log(`Source: ${SRC_ROOT}`);
    console.log(`Output: ${DST_ROOT}`);
    const pngs = await enumeratePngs();
    if (pngs.length === 0) {
        console.log(`No .png tiles found in source.`);
        return;
    }
    console.log(`Found ${pngs.length} source .png tiles.`);
    console.log(`LOD levels: ${LOD_SIZES.join(", ")} px. Concurrency: ${CONCURRENCY}.`);
    const start = Date.now();
    const { totalCleaned, totalBytes } = await processInBatches(pngs, CONCURRENCY, convertTile);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const sizeAfter = await dirSize(DST_ROOT);
    console.log(`Done in ${elapsed}s.`);
    console.log(`  Black pixels → transparent: ${totalCleaned.toLocaleString()}`);
    console.log(`  Total WebP output: ${fmtMb(totalBytes)}`);
    console.log(`  Output tree size: ${fmtMb(sizeAfter)}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
