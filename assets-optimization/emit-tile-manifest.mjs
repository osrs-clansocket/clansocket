#!/usr/bin/env node
// Walk the tile-pyramid output and emit tile-manifest.json so the runtime painter
// can gate tile requests against actually-emitted coordinates. Sparse coverage
// (OSRS plane 3 roofs, ocean / void gaps in lower planes) no longer triggers 404
// floods in the browser console.
//
// Input  (per stitch-map-pyramid.mjs + merge-plane-underlays.mjs output):
//   public/resources/osrs/image_world_map/tiles/<plane>/z<zoom>/<tx>/<ty>.webp
//   public/resources/osrs/image_world_map/tiles-merged/<plane>/z<zoom>/<tx>/<ty>.webp
//
// Output:
//   public/resources/osrs/image_world_map/tiles-manifest.json
//
// Manifest format:
//   { "version": 1,
//     "stride": 1024,
//     "tiles":       { "<plane>": { "<zoom>": [encoded ...] } },
//     "tilesMerged": { "<plane>": { "<zoom>": [encoded ...] } } }
//
//   where encoded = tx * stride + ty (sorted ascending).
//
// Run after stitch-map-pyramid.mjs + merge-plane-underlays.mjs:
//   node assets-optimization/emit-tile-manifest.mjs

import { promises as fs, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TILE_DIR_ROOT = resolve(HERE, "..", "public", "resources", "osrs", "image_world_map");
const MANIFEST_PATH = resolve(TILE_DIR_ROOT, "tiles-manifest.json");
const COORD_STRIDE = 1024;
const VARIANTS = ["tiles", "tiles-merged"];
const WEBP_EXT = ".webp";
const ZOOM_PREFIX = "z";

async function listNumericChildren(dir) {
    if (!existsSync(dir)) return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nums = [];
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        const num = Number(e.name);
        if (!Number.isInteger(num) || String(num) !== e.name) continue;
        nums.push(num);
    }
    return nums.sort((a, b) => a - b);
}

async function listZoomChildren(planeDir) {
    if (!existsSync(planeDir)) return [];
    const entries = await fs.readdir(planeDir, { withFileTypes: true });
    const zooms = [];
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (!e.name.startsWith(ZOOM_PREFIX)) continue;
        const num = Number(e.name.slice(ZOOM_PREFIX.length));
        if (!Number.isInteger(num)) continue;
        zooms.push(num);
    }
    return zooms.sort((a, b) => a - b);
}

async function listTilesInZoom(zoomDir) {
    const txDirs = await listNumericChildren(zoomDir);
    const encoded = [];
    for (const tx of txDirs) {
        const txDir = join(zoomDir, String(tx));
        const entries = await fs.readdir(txDir, { withFileTypes: true });
        for (const e of entries) {
            if (!e.isFile() || !e.name.endsWith(WEBP_EXT)) continue;
            const ty = Number(e.name.slice(0, -WEBP_EXT.length));
            if (!Number.isInteger(ty)) continue;
            encoded.push(tx * COORD_STRIDE + ty);
        }
    }
    encoded.sort((a, b) => a - b);
    return encoded;
}

async function buildVariant(variant) {
    const variantRoot = join(TILE_DIR_ROOT, variant);
    if (!existsSync(variantRoot)) return {};
    const planes = await listNumericChildren(variantRoot);
    const result = {};
    for (const plane of planes) {
        const planeDir = join(variantRoot, String(plane));
        const zooms = await listZoomChildren(planeDir);
        const perZoom = {};
        for (const zoom of zooms) {
            const zoomDir = join(planeDir, `${ZOOM_PREFIX}${zoom}`);
            perZoom[String(zoom)] = await listTilesInZoom(zoomDir);
        }
        result[String(plane)] = perZoom;
    }
    return result;
}

function countTiles(byPlaneZoom) {
    let total = 0;
    for (const plane of Object.keys(byPlaneZoom)) {
        for (const zoom of Object.keys(byPlaneZoom[plane])) {
            total += byPlaneZoom[plane][zoom].length;
        }
    }
    return total;
}

async function main() {
    if (!existsSync(TILE_DIR_ROOT)) {
        console.error(`Tile dir root not found: ${TILE_DIR_ROOT}`);
        process.exit(1);
    }
    console.log(`Scanning ${TILE_DIR_ROOT}...`);
    const manifest = { version: 1, stride: COORD_STRIDE };
    for (const variant of VARIANTS) {
        const key = variant === "tiles" ? "tiles" : "tilesMerged";
        manifest[key] = await buildVariant(variant);
        console.log(`  ${variant}: ${countTiles(manifest[key])} tiles`);
    }
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest));
    const stats = await fs.stat(MANIFEST_PATH);
    console.log(`Wrote ${MANIFEST_PATH} (${stats.size} bytes)`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
