#!/usr/bin/env node
// Stitch the existing per-region /256/ leaves into a slippy-map pyramid.
//
// Coordinates: atlas-image-tile-space throughout.
//   tx = region.px / 256, ty = region.py / 256
// This matches the atlas image convention (y grows southward) and lines up
// with the dashboard painter's viewport.y math without any flip in render.
//
// Input  (per-region leaves, untouched):
//   public/resources/osrs/image_world_map/tiles/<plane>/256/<region_id>.webp
//
// Output (pyramid layers including the leaf layer, copied from /256/):
//   public/resources/osrs/image_world_map/tiles/<plane>/z<zoom>/<tx>/<ty>.webp
//
// Zoom 8 = leaves (atlas-tile per region, content identical to /256/ files).
// Zoom Z (Z < 8) = 2x2 stitch of zoom Z+1, downscaled 512 -> 256 via Lanczos3.
//
// Pipeline per stitched tile:
//   1. Load 4 children from zoom Z+1 (some may not exist over water/void).
//   2. Compose into 512x512 RGBA canvas. children[0]=NW, [1]=NE, [2]=SW, [3]=SE.
//      Because ty grows southward, child (2tx, 2ty) IS the NW quadrant.
//   3. Downscale 512 -> 256 with Lanczos3.
//   4. cleanBlack on the downscaled buffer (alpha 0 on #000000).
//   5. Encode WebP lossy q90; re-decode; if drift remains opaque-black, lossless.
//   6. Write to output path; mkdir -p as needed.
//
// Run: node assets-optimization/stitch-map-pyramid.mjs

import sharp from "sharp";
import Database from "better-sqlite3";
import { promises as fs, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const TILE_ROOT = resolve(HERE, "..", "public", "resources", "osrs", "image_world_map", "tiles");
const WORLD_MAP_DB = resolve(HERE, "..", "main", "server", "data", "map", "world_map.db");

const TILE_PX = 256;
const LEGACY_LOD_DIR = 256;
const MAX_ZOOM = 8;
const RGBA_CHANNELS = 4;
const QUAD_COUNT = 4;
const CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 8));
const LOSSY_OPTS = { quality: 90, effort: 6 };
const LOSSLESS_OPTS = { lossless: true, effort: 4 };

function cleanBlack(rgba) {
    let count = 0;
    for (let i = 0; i < rgba.length; i += RGBA_CHANNELS) {
        if (rgba[i] === 0 && rgba[i + 1] === 0 && rgba[i + 2] === 0) {
            rgba[i + 3] = 0;
            count++;
        }
    }
    return count;
}

function hasOpaqueBlack(rgba) {
    for (let i = 0; i < rgba.length; i += RGBA_CHANNELS) {
        if (rgba[i] === 0 && rgba[i + 1] === 0 && rgba[i + 2] === 0 && rgba[i + 3] !== 0) return true;
    }
    return false;
}

async function encodeWithDriftCheck(rgbaBuf, width, height) {
    const raw = { raw: { width, height, channels: RGBA_CHANNELS } };
    const lossyBuf = await sharp(rgbaBuf, raw).webp(LOSSY_OPTS).toBuffer();
    const verify = await sharp(lossyBuf).ensureAlpha().raw().toBuffer();
    if (hasOpaqueBlack(verify)) {
        return sharp(rgbaBuf, raw).webp(LOSSLESS_OPTS).toBuffer();
    }
    return lossyBuf;
}

function tilePath(plane, zoom, tx, ty) {
    return join(TILE_ROOT, String(plane), `z${zoom}`, String(tx), `${ty}.webp`);
}

function legacyLeafPath(plane, regionId) {
    return join(TILE_ROOT, String(plane), String(LEGACY_LOD_DIR), `${regionId}.webp`);
}

function readAtlasMap() {
    if (!existsSync(WORLD_MAP_DB)) {
        throw new Error(`world_map.db not found at ${WORLD_MAP_DB}. Run npm run map:db first.`);
    }
    const db = new Database(WORLD_MAP_DB, { readonly: true });
    try {
        const rows = db.prepare("SELECT region_id, px, py, pw, ph FROM map_regions").all();
        const tileToRegion = new Map();
        for (const row of rows) {
            if (row.pw !== TILE_PX || row.ph !== TILE_PX) {
                throw new Error(`Region ${row.region_id} has size ${row.pw}x${row.ph}, expected ${TILE_PX}x${TILE_PX}`);
            }
            if (row.px % TILE_PX !== 0 || row.py % TILE_PX !== 0) {
                throw new Error(`Region ${row.region_id} px/py not aligned to ${TILE_PX}: (${row.px}, ${row.py})`);
            }
            const tx = row.px / TILE_PX;
            const ty = row.py / TILE_PX;
            tileToRegion.set(`${tx}:${ty}`, row.region_id);
        }
        return tileToRegion;
    } finally {
        db.close();
    }
}

async function copyLeavesToZoom8(plane, tileToRegion) {
    const copiedKeys = [];
    for (const [key, regionId] of tileToRegion) {
        const legacyPath = legacyLeafPath(plane, regionId);
        if (!existsSync(legacyPath)) continue;
        const colon = key.indexOf(":");
        const tx = Number(key.slice(0, colon));
        const ty = Number(key.slice(colon + 1));
        const outPath = tilePath(plane, MAX_ZOOM, tx, ty);
        await fs.mkdir(dirname(outPath), { recursive: true });
        await fs.copyFile(legacyPath, outPath);
        copiedKeys.push(key);
    }
    return copiedKeys;
}

async function loadTileRgba(plane, zoom, tx, ty) {
    const path = tilePath(plane, zoom, tx, ty);
    if (!existsSync(path)) return null;
    const buf = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (buf.info.width !== TILE_PX || buf.info.height !== TILE_PX) {
        throw new Error(`Tile ${path} is ${buf.info.width}x${buf.info.height}, expected ${TILE_PX}x${TILE_PX}`);
    }
    return buf.data;
}

function blankCanvas() {
    const canvasPx = TILE_PX * 2;
    return Buffer.alloc(canvasPx * canvasPx * RGBA_CHANNELS);
}

function blitQuadrant(canvas, childRgba, quadIndex) {
    const canvasStride = TILE_PX * 2 * RGBA_CHANNELS;
    const childStride = TILE_PX * RGBA_CHANNELS;
    const qx = (quadIndex & 1) * TILE_PX;
    const qy = (quadIndex >> 1) * TILE_PX;
    for (let row = 0; row < TILE_PX; row++) {
        const srcOffset = row * childStride;
        const dstOffset = (qy + row) * canvasStride + qx * RGBA_CHANNELS;
        childRgba.copy(canvas, dstOffset, srcOffset, srcOffset + childStride);
    }
}

async function stitchTile(plane, zoom, tx, ty) {
    const children = await Promise.all([
        loadTileRgba(plane, zoom + 1, 2 * tx, 2 * ty),
        loadTileRgba(plane, zoom + 1, 2 * tx + 1, 2 * ty),
        loadTileRgba(plane, zoom + 1, 2 * tx, 2 * ty + 1),
        loadTileRgba(plane, zoom + 1, 2 * tx + 1, 2 * ty + 1),
    ]);
    if (children.every((c) => c === null)) return null;
    const canvas = blankCanvas();
    for (let i = 0; i < QUAD_COUNT; i++) {
        if (children[i] !== null) blitQuadrant(canvas, children[i], i);
    }
    const canvasPx = TILE_PX * 2;
    const rawIn = { raw: { width: canvasPx, height: canvasPx, channels: RGBA_CHANNELS } };
    const downscaled = await sharp(canvas, rawIn)
        .resize(TILE_PX, TILE_PX, { kernel: "lanczos3" })
        .raw()
        .toBuffer({ resolveWithObject: true });
    cleanBlack(downscaled.data);
    return encodeWithDriftCheck(downscaled.data, downscaled.info.width, downscaled.info.height);
}

function parentLevel(childOccupied) {
    const parent = new Set();
    for (const key of childOccupied) {
        const colon = key.indexOf(":");
        const cx = Number(key.slice(0, colon));
        const cy = Number(key.slice(colon + 1));
        parent.add(`${cx >> 1}:${cy >> 1}`);
    }
    return parent;
}

function keysToCoords(occupied) {
    const coords = [];
    for (const key of occupied) {
        const colon = key.indexOf(":");
        coords.push({ tx: Number(key.slice(0, colon)), ty: Number(key.slice(colon + 1)) });
    }
    return coords;
}

async function processInBatches(coords, batchSize, fn) {
    let done = 0;
    let wrote = 0;
    for (let i = 0; i < coords.length; i += batchSize) {
        const batch = coords.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(fn));
        for (const wroteBytes of results) if (wroteBytes > 0) wrote++;
        done += batch.length;
        process.stdout.write(`\r    ${done}/${coords.length} tiles processed`);
    }
    process.stdout.write("\n");
    return wrote;
}

async function buildPyramidForPlane(plane, tileToRegion) {
    console.log(`\nPlane ${plane}:`);
    const leafKeys = await copyLeavesToZoom8(plane, tileToRegion);
    console.log(`  zoom ${MAX_ZOOM} (leaves): copied ${leafKeys.length} from /${LEGACY_LOD_DIR}/`);
    if (leafKeys.length === 0) {
        console.log(`  no leaves for plane ${plane}, skipping`);
        return;
    }
    let occupied = new Set(leafKeys);
    for (let zoom = MAX_ZOOM - 1; zoom >= 0; zoom--) {
        occupied = parentLevel(occupied);
        const coords = keysToCoords(occupied);
        console.log(`  zoom ${zoom}: ${coords.length} candidate tiles`);
        const wrote = await processInBatches(coords, CONCURRENCY, async ({ tx, ty }) => {
            const buf = await stitchTile(plane, zoom, tx, ty);
            if (buf === null) return 0;
            const outPath = tilePath(plane, zoom, tx, ty);
            await fs.mkdir(dirname(outPath), { recursive: true });
            await fs.writeFile(outPath, buf);
            return buf.length;
        });
        console.log(`    wrote ${wrote} tiles`);
    }
}

async function discoverPlanes() {
    const planes = [];
    const entries = await fs.readdir(TILE_ROOT, { withFileTypes: true });
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        const num = Number(e.name);
        if (!Number.isInteger(num) || num < 0 || String(num) !== e.name) continue;
        const leafDir = join(TILE_ROOT, e.name, String(LEGACY_LOD_DIR));
        if (existsSync(leafDir)) planes.push(num);
    }
    return planes.sort((a, b) => a - b);
}

async function main() {
    if (!existsSync(TILE_ROOT)) {
        console.error(`Tile root not found: ${TILE_ROOT}`);
        process.exit(1);
    }
    const tileToRegion = readAtlasMap();
    console.log(`Atlas map: ${tileToRegion.size} regions loaded from world_map.db`);
    const planes = await discoverPlanes();
    if (planes.length === 0) {
        console.error(`No planes with /${LEGACY_LOD_DIR}/ leaves found under ${TILE_ROOT}`);
        process.exit(1);
    }
    console.log(`Tile root: ${TILE_ROOT}`);
    console.log(`Planes: ${planes.join(", ")}`);
    console.log(`Max zoom: ${MAX_ZOOM}. Tile size: ${TILE_PX}x${TILE_PX}. Concurrency: ${CONCURRENCY}.`);
    const start = Date.now();
    for (const plane of planes) {
        await buildPyramidForPlane(plane, tileToRegion);
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nDone in ${elapsed}s.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
