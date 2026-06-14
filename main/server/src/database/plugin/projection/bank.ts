import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";
import { upsertItemsCatalog } from "./items-catalog.js";

interface BankItem {
    id: number;
    qty: number;
    name?: string;
    price?: number;
    slot?: number;
    bankTab?: number;
}

function upsertBankItem(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    item: BankItem,
    now: number,
): void {
    if (typeof item.id !== "number") return;
    const itemName = typeof item.name === "string" ? item.name : "";
    const price = typeof item.price === "number" && item.price > 0 ? item.price : null;
    const slot = typeof item.slot === "number" && item.slot >= 0 ? item.slot : null;
    const bankTab = typeof item.bankTab === "number" ? item.bankTab : null;
    conn.prepare(
        `INSERT INTO plugin_bank (account_hash, rsn, item_id, item_name, qty, unit_price_gp, slot, bank_tab, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, item_id) DO UPDATE SET
            rsn = excluded.rsn,
            item_name = excluded.item_name,
            qty = excluded.qty,
            unit_price_gp = COALESCE(excluded.unit_price_gp, unit_price_gp),
            slot = excluded.slot,
            bank_tab = excluded.bank_tab,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN qty != excluded.qty
                  OR item_name != excluded.item_name
                  OR COALESCE(unit_price_gp, -1) != COALESCE(excluded.unit_price_gp, -1)
                  OR COALESCE(slot, -1) != COALESCE(excluded.slot, -1)
                  OR COALESCE(bank_tab, -1) != COALESCE(excluded.bank_tab, -1)
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run(accountHash, rsn ?? "", item.id, itemName, item.qty, price, slot, bankTab, now, now, now);
}

function reconcileBank(conn: Database.Database, accountHash: string, keepIds: number[]): void {
    if (keepIds.length === 0) {
        conn.prepare(`DELETE FROM plugin_bank WHERE account_hash = ?`).run(accountHash);
        return;
    }
    const ph = keepIds.map(() => "?").join(",");
    conn.prepare(`DELETE FROM plugin_bank WHERE account_hash = ? AND item_id NOT IN (${ph})`).run(
        accountHash,
        ...keepIds,
    );
}

function upsertBankItems(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    items: BankItem[],
    now: number,
): void {
    const keepIds: number[] = [];
    for (const item of items) {
        if (typeof item.id !== "number") continue;
        upsertBankItem(conn, accountHash, rsn, item, now);
        keepIds.push(item.id);
    }
    reconcileBank(conn, accountHash, keepIds);
}

export function handleBankOpen(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    _envelope: EventEnvelopeCols,
): void {
    const items: BankItem[] = Array.isArray(payload.items) ? payload.items : [];
    conn.transaction(() => {
        upsertItemsCatalog(conn, items, now);
        upsertBankItems(conn, accountHash, rsn, items, now);
    })();
}

export function handleBankClose(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const items: BankItem[] = Array.isArray(payload.items) ? payload.items : [];
    const changes: BankItem[] = Array.isArray(payload.changes) ? payload.changes : [];
    const where = extractWhere(payload);
    const insertChange = conn.prepare(
        `INSERT INTO plugin_bank_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, item_id, item_name, qty_signed, unit_price_gp,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        upsertItemsCatalog(conn, items, now);
        upsertItemsCatalog(conn, changes, now);
        upsertBankItems(conn, accountHash, rsn, items, now);
        for (const c of changes) {
            if (typeof c.id !== "number" || typeof c.qty !== "number" || c.qty === 0) continue;
            const itemName = typeof c.name === "string" ? c.name : "";
            const price = typeof c.price === "number" && c.price > 0 ? c.price : null;
            const dedup = rowDedupHash(
                accountHash,
                "bank_change",
                c.id,
                c.qty,
                envelope.session_seq,
                where.world ?? 0,
                where.x ?? 0,
                where.y ?? 0,
                where.plane ?? 0,
            );
            insertChange.run(
                accountHash,
                rsn ?? "",
                envelope.session_id,
                envelope.session_seq,
                envelope.event_received_at,
                envelope.plugin_version,
                c.id,
                itemName,
                c.qty,
                price,
                where.world ?? 0,
                where.x ?? 0,
                where.y ?? 0,
                where.plane ?? 0,
                where.region_id ?? 0,
                where.region_name ?? "",
                where.area,
                dedup,
            );
        }
    })();
}
