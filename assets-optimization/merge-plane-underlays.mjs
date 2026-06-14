#!/usr/bin/env node
// Bake faded-underlay composites of every lower plane into each plane-N
// tile so the dashboard renders ghost-floor context without client-side
// compositing. Runs AFTER stitch-map-pyramid.mjs and reads the pyramid
// tile tree at tiles/<plane>/z<zoom>/<tx>/<ty>.webp.
//
// Chain (alpha-respecting porter-duff "over" with global alpha scaling
// of the accumulator before the next layer composites on top):
//   P0  unchanged
//   P1  = L1 over (L0 × 0.25)
//   P2  = BASE  = L1 over (L0 × 0.50);  P2 = L2 over (BASE × 0.50)
//   P3  = BASE  = L1 over (L0 × 0.75);
//         LAYER = L2 over (BASE × 0.75);
//         P3    = L3 over (LAYER × 4/9)
//
// Final per-layer effective opacities (L0 invariant at 25 % across all):
//                 L0     L1       L2       L3
//   P1  ........  25 %   100 %    -        -
//   P2  ........  25 %   50 %     100 %    -
//   P3  ........  25 %   33.33 %  44.44 %  100 %
//
// Output: public/resources/osrs/image_world_map/tiles-merged/<plane>/z<Z>/<tx>/<ty>.webp
// P0 mirror-copied so the dashboard tile-url-formatter resolves uniformly
// against tiles-merged/ regardless of plane.
//
// Run: node assets-optimization/merge-plane-underlays.mjs

import sharp from "sharp";
import { promises as fs, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = resolve(HERE, "..", "public", "resources", "osrs", "image_world_map", "tiles");
const DST_ROOT = resolve(HERE, "..", "public", "resources", "osrs", "image_world_map", "tiles-merged");

const TILE_PX = 256;
const RGBA_CHANNELS = 4;
const MAX_ZOOM = 8;
const MIN_ZOOM = 0;
const ALPHA_BYTE_MAX = 255;
const CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 8));
const LOSSY_OPTS = { quality: 90, effort: 6 };
const LOSSLESS_OPTS = { lossless: true, effort: 4 };
const WEBP_SUFFIX = ".webp";
const WEBP_SUFFIX_LEN = WEBP_SUFFIX.length;

const PLANE_CHAINS = {
    1: [0.25],
    2: [0.5, 0.5],
    3: [0.75, 0.75, 4 / 9],
};

function tilePath(root, plane, zoom, tx, ty) {
    return join(root, String(plane), `z${zoom}`, String(tx), `${ty}${WEBP_SUFFIX}`);
}

function blankRgba() {
    return Buffer.alloc(TILE_PX * TILE_PX * RGBA_CHANNELS);
}

async function loadTileRgba(root, plane, zoom, tx, ty) {
    const path = tilePath(root, plane, zoom, tx, ty);
    if (!existsSync(path)) return blankRgba();
    const buf = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (buf.info.width !== TILE_PX || buf.info.height !== TILE_PX) {
        throw new Error(`Tile ${path} is ${buf.info.width}x${buf.info.height}, expected ${TILE_PX}x${TILE_PX}`);
    }
    return buf.data;
}

function scaleAlphaInPlace(rgba, factor) {
    for (let i = 3; i < rgba.length; i += RGBA_CHANNELS) {
        rgba[i] = Math.round(rgba[i] * factor);
    }
}

function compositeOver(topRgba, bottomRgba) {
    const out = Buffer.alloc(topRgba.length);
    for (let i = 0; i < topRgba.length; i += RGBA_CHANNELS) {
        const aT = topRgba[i + 3] / ALPHA_BYTE_MAX;
        const aB = bottomRgba[i + 3] / ALPHA_BYTE_MAX;
        const oneMinusAT = 1 - aT;
        const aO = aT + aB * oneMinusAT;
        if (aO === 0) continue;
        const bWeight = aB * oneMinusAT;
        out[i] = Math.round((topRgba[i] * aT + bottomRgba[i] * bWeight) / aO);
        out[i + 1] = Math.round((topRgba[i + 1] * aT + bottomRgba[i + 1] * bWeight) / aO);
        out[i + 2] = Math.round((topRgba[i + 2] * aT + bottomRgba[i + 2] * bWeight) / aO);
        out[i + 3] = Math.round(aO * ALPHA_BYTE_MAX);
    }
    return out;
}

function cleanBlack(rgba) {
    for (let i = 0; i < rgba.length; i += RGBA_CHANNELS) {
        if (rgba[i] === 0 && rgba[i + 1] === 0 && rgba[i + 2] === 0) {
            rgba[i + 3] = 0;
        }
    }
}

function hasOpaqueBlack(rgba) {
    for (let i = 0; i < rgba.length; i += RGBA_CHANNELS) {
        if (rgba[i] === 0 && rgba[i + 1] === 0 && rgba[i + 2] === 0 && rgba[i + 3] !== 0) return true;
    }
    return false;
}

async function encodeWithDriftCheck(rgba) {
    const raw = { raw: { width: TILE_PX, height: TILE_PX, channels: RGBA_CHANNELS } };
    const lossyBuf = await sharp(rgba, raw).webp(LOSSY_OPTS).toBuffer();
    const verify = await sharp(lossyBuf).ensureAlpha().raw().toBuffer();
    if (hasOpaqueBlack(verify)) {
        return sharp(rgba, raw).webp(LOSSLESS_OPTS).toBuffer();
    }
    return lossyBuf;
}

async function mergePlaneTile(plane, zoom, tx, ty) {
    const factors = PLANE_CHAINS[plane];
    let accumulator = await loadTileRgba(SRC_ROOT, 0, zoom, tx, ty);
    for (let layerIdx = 0; layerIdx < factors.length; layerIdx++) {
        scaleAlphaInPlace(accumulator, factors[layerIdx]);
        const next = await loadTileRgba(SRC_ROOT, layerIdx + 1, zoom, tx, ty);
        accumulator = compositeOver(next, accumulator);
    }
    cleanBlack(accumulator);
    return encodeWithDriftCheck(accumulator);
}

function parsePositiveInt(str) {
    const n = Number(str);
    if (!Number.isInteger(n) || n < 0 || String(n) !== str) return null;
    return n;
}

async function enumeratePlaneTiles(plane) {
    const coords = [];
    for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom++) {
        const zoomDir = join(SRC_ROOT, String(plane), `z${zoom}`);
        if (!existsSync(zoomDir)) continue;
        const txDirs = await fs.readdir(zoomDir, { withFileTypes: true });
        for (const txEntry of txDirs) {
            if (!txEntry.isDirectory()) continue;
            const tx = parsePositiveInt(txEntry.name);
            if (tx === null) continue;
            const tyDir = join(zoomDir, txEntry.name);
            const tyFiles = await fs.readdir(tyDir, { withFileTypes: true });
            for (const tyEntry of tyFiles) {
                if (!tyEntry.isFile()) continue;
                if (!tyEntry.name.endsWith(WEBP_SUFFIX)) continue;
                const ty = parsePositiveInt(tyEntry.name.slice(0, -WEBP_SUFFIX_LEN));
                if (ty === null) continue;
                coords.push({ zoom, tx, ty });
            }
        }
    }
    return coords;
}

async function processInBatches(items, batchSize, fn) {
    let done = 0;
    let wrote = 0;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(fn));
        for (const ok of results) if (ok) wrote++;
        done += batch.length;
        process.stdout.write(`\r    ${done}/${items.length} tiles processed`);
    }
    process.stdout.write("\n");
    return wrote;
}

async function buildMergedPlane(plane) {
    const factors = PLANE_CHAINS[plane];
    console.log(`\nPlane ${plane}: merging with chain factors ${factors.map((f) => f.toFixed(4)).join(", ")}`);
    const coords = await enumeratePlaneTiles(plane);
    console.log(`  ${coords.length} tiles found across z${MIN_ZOOM}..z${MAX_ZOOM}`);
    if (coords.length === 0) return;
    const wrote = await processInBatches(coords, CONCURRENCY, async ({ zoom, tx, ty }) => {
        const buf = await mergePlaneTile(plane, zoom, tx, ty);
        if (buf === null || buf.length === 0) return false;
        const outPath = tilePath(DST_ROOT, plane, zoom, tx, ty);
        await fs.mkdir(dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, buf);
        return true;
    });
    console.log(`    wrote ${wrote} tiles`);
}

async function copyDirRecursive(src, dst) {
    await fs.mkdir(dst, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const e of entries) {
        const s = join(src, e.name);
        const d = join(dst, e.name);
        if (e.isDirectory()) await copyDirRecursive(s, d);
        else if (e.isFile()) await fs.copyFile(s, d);
    }
}

async function mirrorPlaneZero() {
    const src = join(SRC_ROOT, "0");
    const dst = join(DST_ROOT, "0");
    if (!existsSync(src)) {
        console.error(`Plane 0 source not found at ${src}`);
        return;
    }
    console.log(`\nPlane 0: mirroring tree (unmerged base) to tiles-merged/0/`);
    await copyDirRecursive(src, dst);
    console.log("    done");
}

async function main() {
    if (!existsSync(SRC_ROOT)) {
        console.error(`Source tile root not found: ${SRC_ROOT}`);
        process.exit(1);
    }
    console.log(`Source: ${SRC_ROOT}`);
    console.log(`Output: ${DST_ROOT}`);
    console.log(`Concurrency: ${CONCURRENCY}`);
    const start = Date.now();
    await mirrorPlaneZero();
    for (const planeStr of Object.keys(PLANE_CHAINS)) {
        await buildMergedPlane(Number(planeStr));
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nDone in ${elapsed}s.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
