// Idempotent filler for game_ids.db. Schemas are the source of truth + live at
// main/server/src/database/schemas/game_ids/*.sql; the server applies them on
// first openStaticDb. This script does the same (so a fresh checkout build
// works without first running the server) AND fills rows from the catalog
// JSONs. Safe to re-run — DELETE + INSERT inside a transaction.
// Run: node scripts/build-scripts/build-game-ids-db-script.mjs [catalogsDir] [outputDbPath]
import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOGS_DIR = process.argv[2] || "D:/BanesLab/ClanSocket/extracted-cache-assets/catalogs";
const DEFAULT_OUTPUT_DB = join(HERE, "..", "..", "main", "server", "data", "game_ids.db");
const OUTPUT_DB = process.argv[3] || DEFAULT_OUTPUT_DB;
const SCHEMA_DIR = join(HERE, "..", "..", "main", "server", "src", "database", "schemas", "game_ids");

const items = JSON.parse(readFileSync(join(CATALOGS_DIR, "items.json"), "utf8"));
const objects = JSON.parse(readFileSync(join(CATALOGS_DIR, "objects.json"), "utf8"));
const npcs = JSON.parse(readFileSync(join(CATALOGS_DIR, "npcs.json"), "utf8"));

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

db.exec("DELETE FROM items");
db.exec("DELETE FROM objects");
db.exec("DELETE FROM npcs");
db.exec("DELETE FROM game_ids_meta");

const insertItem = db.prepare(`INSERT INTO items
    (item_id, name, stackable, tradeable, noted, linked_note_id)
    VALUES (@item_id, @name, @stackable, @tradeable, @noted, @linked_note_id)`);

const insertObject = db.prepare(`INSERT INTO objects (object_id, name) VALUES (@object_id, @name)`);

const insertNpc = db.prepare(`INSERT INTO npcs (npc_id, name) VALUES (@npc_id, @name)`);

const insertMeta = db.prepare(`INSERT INTO game_ids_meta
    (id, item_count, object_count, npc_count, cache_id, cache_timestamp, built_at)
    VALUES (1, @item_count, @object_count, @npc_count, @cache_id, @cache_timestamp, @built_at)`);

function bool(v) {
    return v ? 1 : 0;
}

const fill = db.transaction(() => {
    for (const it of items) {
        insertItem.run({
            item_id: it.id,
            name: it.name ?? "",
            stackable: bool(it.stackable),
            tradeable: bool(it.tradeable),
            noted: bool(it.noted),
            linked_note_id: it.linkedNoteId ?? -1,
        });
    }
    for (const obj of objects) {
        insertObject.run({ object_id: obj.id, name: obj.name ?? "" });
    }
    for (const npc of npcs) {
        insertNpc.run({ npc_id: npc.id, name: npc.name ?? "" });
    }
    insertMeta.run({
        item_count: items.length,
        object_count: objects.length,
        npc_count: npcs.length,
        cache_id: null,
        cache_timestamp: null,
        built_at: Date.now(),
    });
});
fill();

const itemCount = db.prepare("SELECT COUNT(*) AS c FROM items").get().c;
const objectCount = db.prepare("SELECT COUNT(*) AS c FROM objects").get().c;
const npcCount = db.prepare("SELECT COUNT(*) AS c FROM npcs").get().c;
db.close();
console.log(`Filled ${OUTPUT_DB}: ${itemCount} items, ${objectCount} objects, ${npcCount} npcs`);
