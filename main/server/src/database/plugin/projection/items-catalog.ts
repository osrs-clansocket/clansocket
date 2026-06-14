import type Database from "better-sqlite3";

export interface ItemCatalogEntry {
    id?: number;
    itemId?: number;
    name?: string;
    itemName?: string;
    price?: number;
    unit_price_gp?: number;
}

export function upsertItemsCatalog(conn: Database.Database, entries: ItemCatalogEntry[], now: number): void {
    if (entries.length === 0) return;
    const stmt = conn.prepare(
        `INSERT INTO plugin_items_catalog (item_id, item_name, price_gp, last_seen_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (item_id) DO UPDATE SET
            item_name = COALESCE(NULLIF(excluded.item_name, ''), item_name),
            price_gp = CASE WHEN excluded.price_gp > 0 THEN excluded.price_gp ELSE price_gp END,
            last_seen_at = excluded.last_seen_at`,
    );
    for (const e of entries) {
        const itemId = typeof e.itemId === "number" ? e.itemId : typeof e.id === "number" ? e.id : null;
        if (itemId === null) continue;
        const itemName =
            typeof e.itemName === "string" && e.itemName.length > 0
                ? e.itemName
                : typeof e.name === "string" && e.name.length > 0
                  ? e.name
                  : "";
        const price =
            typeof e.price === "number" && e.price > 0
                ? e.price
                : typeof e.unit_price_gp === "number" && e.unit_price_gp > 0
                  ? e.unit_price_gp
                  : 0;
        stmt.run(itemId, itemName, price, now);
    }
}

export function readItemCatalogPrice(conn: Database.Database, itemId: number): number | null {
    const row = conn.prepare("SELECT price_gp FROM plugin_items_catalog WHERE item_id = ?").get(itemId) as
        | { price_gp: number }
        | undefined;
    return row && row.price_gp > 0 ? row.price_gp : null;
}
