// Idempotent filler for world_map.db. Schemas are the source of truth + live
// at main/server/src/database/schemas/world_map/*.sql; the server applies them
// on first openStaticDb. This script does the same (so a fresh checkout build
// works without first running the server) AND fills rows from manifest.json.
// Safe to re-run — DELETE + INSERT inside a transaction.
// Run: node scripts/build-scripts/build-world-map-db-script.mjs [mapDir] [outputDbPath]
import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MAP_DIR = process.argv[2] || "D:/BanesLab/ClanSocket/extracted-cache-assets/map";
const DEFAULT_OUTPUT_DB = join(HERE, "..", "..", "main", "server", "data", "map", "world_map.db");
const OUTPUT_DB = process.argv[3] || DEFAULT_OUTPUT_DB;
const SCHEMA_DIR = join(HERE, "..", "..", "main", "server", "src", "database", "schemas", "world_map");

const manifest = JSON.parse(readFileSync(join(MAP_DIR, "manifest.json"), "utf8"));
mkdirSync(dirname(OUTPUT_DB), { recursive: true });

const db = new Database(OUTPUT_DB);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 3000");
db.pragma("foreign_keys = ON");

const schemaFiles = readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
for (const file of schemaFiles) {
    db.exec(readFileSync(resolve(SCHEMA_DIR, file), "utf-8"));
}

db.exec("DELETE FROM map_regions");
db.exec("DELETE FROM map_planes");
db.exec("DELETE FROM map_meta");

const insertMeta = db.prepare(`INSERT INTO map_meta
    (id, width, height, tiles_per_region, pixels_per_tile, region_px,
     origin_world_x, top_world_y, region_count, cache_id, cache_timestamp, built_at)
    VALUES (1, @width, @height, @tiles_per_region, @pixels_per_tile, @region_px,
            @origin_world_x, @top_world_y, @region_count, @cache_id, @cache_timestamp, @built_at)`);

const insertPlane = db.prepare(`INSERT INTO map_planes
    (plane, image, tiles_dir, region_count)
    VALUES (@plane, @image, @tiles_dir, @region_count)`);

const insertRegion = db.prepare(`INSERT INTO map_regions
    (region_id, rx, ry, base_x, base_y, px, py, pw, ph)
    VALUES (@region_id, @rx, @ry, @base_x, @base_y, @px, @py, @pw, @ph)`);

const fill = db.transaction(() => {
    insertMeta.run({
        width: manifest.width,
        height: manifest.height,
        tiles_per_region: manifest.tilesPerRegion,
        pixels_per_tile: manifest.pixelsPerTile,
        region_px: manifest.regionPx,
        origin_world_x: manifest.originWorldX,
        top_world_y: manifest.topWorldY,
        region_count: manifest.regionCount,
        cache_id: manifest.cacheId ?? null,
        cache_timestamp: manifest.cacheTimestamp ?? null,
        built_at: Date.now(),
    });
    for (const p of manifest.planes ?? []) {
        insertPlane.run({
            plane: p.plane,
            image: p.image,
            tiles_dir: p.tilesDir ?? null,
            region_count: p.regionCount,
        });
    }
    for (const r of manifest.regions) {
        insertRegion.run({
            region_id: r.id,
            rx: r.rx,
            ry: r.ry,
            base_x: r.baseX,
            base_y: r.baseY,
            px: r.px,
            py: r.py,
            pw: r.pw,
            ph: r.ph,
        });
    }
});
fill();

const regionCount = db.prepare("SELECT COUNT(*) AS c FROM map_regions").get().c;
const planeCount = db.prepare("SELECT COUNT(*) AS c FROM map_planes").get().c;
db.close();
console.log(`Filled ${OUTPUT_DB}: ${planeCount} planes, ${regionCount} regions (${manifest.width}x${manifest.height})`);
