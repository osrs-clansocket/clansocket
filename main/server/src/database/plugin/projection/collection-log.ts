import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, sanitizeItemName, type Payload } from "./helpers.js";
import { upsertItemsCatalog } from "./items-catalog.js";

interface CollectionLogSnapshotItem {
    itemId: number;
    name?: string;
    quantity?: number;
    category?: string;
    price?: number;
}

interface CollectionLogEntry {
    itemId: number;
    itemName?: string;
    category?: string;
    sourceKind?: string;
}

function upsertCollectionLogItem(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    item: CollectionLogSnapshotItem,
    now: number,
): void {
    if (typeof item.itemId !== "number") return;
    const itemName = typeof item.name === "string" ? sanitizeItemName(item.name) : "";
    const category = typeof item.category === "string" ? item.category : "";
    const qty = typeof item.quantity === "number" ? item.quantity : 0;
    conn.prepare(
        `INSERT INTO plugin_collection_log (account_hash, rsn, item_id, item_name, category, qty, first_seen, last_seen, updated_at)
         VALUES ($accountHash, $rsn, $itemId, $itemName, $category, $qty, $now, $now, $now)
         ON CONFLICT (account_hash, item_id) DO UPDATE SET
            rsn = excluded.rsn,
            item_name = excluded.item_name,
            category = excluded.category,
            qty = excluded.qty,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN qty != excluded.qty
                  OR item_name != excluded.item_name
                  OR category != excluded.category
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run({ accountHash, rsn: rsn ?? "", itemId: item.itemId, itemName, category, qty, now });
}

export function handleCollectionLogSnapshot(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    _envelope: EventEnvelopeCols,
): void {
    const items: CollectionLogSnapshotItem[] = Array.isArray(payload.items) ? payload.items : [];
    const catalogItems = items.map((i) => ({ id: i.itemId, name: i.name, price: i.price }));
    conn.transaction(() => {
        upsertItemsCatalog(conn, catalogItems, now);
        for (const item of items) upsertCollectionLogItem(conn, accountHash, rsn, item, now);
    })();
}

export function handleCollectionLogEntry(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const entry: CollectionLogEntry = payload;
    if (typeof entry.itemId !== "number") return;
    const itemName = typeof entry.itemName === "string" ? sanitizeItemName(entry.itemName) : "";
    const category = typeof entry.category === "string" ? entry.category : "";
    const sourceKind = typeof entry.sourceKind === "string" ? entry.sourceKind : "other";
    const where = extractWhere(payload);
    conn.transaction(() => {
        upsertCollectionLogItem(
            conn,
            accountHash,
            rsn,
            {
                itemId: entry.itemId,
                name: itemName,
                category,
                quantity: 1,
            },
            now,
        );
        const dedup = rowDedupHash(
            accountHash,
            "collection_log_entry",
            entry.itemId,
            category,
            sourceKind,
            envelope.session_seq,
            where.world ?? 0,
            where.x ?? 0,
            where.y ?? 0,
            where.plane ?? 0,
        );
        conn.prepare(
            `INSERT INTO plugin_collection_log_changes
                (account_hash, rsn, session_id, session_seq, event_received_at,
                 plugin_version, item_id, item_name, category, source_kind, qty_signed,
                 world, x, y, plane, region_id, region_name, area, dedup_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(dedup_hash) DO NOTHING`,
        ).run(
            accountHash,
            rsn ?? "",
            envelope.session_id,
            envelope.session_seq,
            envelope.event_received_at,
            envelope.plugin_version,
            entry.itemId,
            itemName,
            category,
            sourceKind,
            1,
            where.world ?? 0,
            where.x ?? 0,
            where.y ?? 0,
            where.plane ?? 0,
            where.region_id ?? 0,
            where.region_name ?? "",
            where.area,
            dedup,
        );
    })();
}
