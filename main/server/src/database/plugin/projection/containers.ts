import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";
import { upsertItemsCatalog } from "./items-catalog.js";

interface ContainerItem {
    id: number;
    qty: number;
    name?: string;
    price?: number;
    slot?: number;
}

interface RunePouchSlot {
    slot: number;
    itemId: number;
    qty: number;
    name?: string;
    price?: number;
}

interface AggItem {
    qty: number;
    name: string;
    price: number | null;
}

const INVENTORY = "INVENTORY";
const EQUIPMENT = "EQUIPMENT";
const SEED_VAULT = "SEED_VAULT";
const KIND_MAIN = "MAIN";
const KIND_RUNE_POUCH = "RUNE_POUCH";

const EQUIPMENT_SLOTS: Record<number, string> = {
    0: "HEAD",
    1: "CAPE",
    2: "AMULET",
    3: "WEAPON",
    4: "BODY",
    5: "SHIELD",
    6: "ARMS",
    7: "LEGS",
    8: "HAIR",
    9: "GLOVES",
    10: "BOOTS",
    11: "JAW",
    12: "RING",
    13: "AMMO",
};

function itemName(item: ContainerItem): string {
    return typeof item.name === "string" ? item.name : "";
}

function itemPrice(item: ContainerItem): number | null {
    return typeof item.price === "number" && item.price > 0 ? item.price : null;
}

function aggregateById(items: ContainerItem[]): Map<number, AggItem> {
    const agg = new Map<number, AggItem>();
    for (const it of items) {
        if (typeof it.id !== "number" || it.id <= 0) continue;
        const qty = typeof it.qty === "number" ? it.qty : 0;
        if (qty <= 0) continue;
        const cur = agg.get(it.id);
        if (cur) {
            cur.qty += qty;
            if (it.name) cur.name = it.name;
            const p = itemPrice(it);
            if (p !== null) cur.price = p;
        } else {
            agg.set(it.id, { qty, name: itemName(it), price: itemPrice(it) });
        }
    }
    return agg;
}

// ── INVENTORY (slot-keyed: container_kind + slot) ─────────────────────

function snapshotInventory(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    containerKind: string,
    items: ContainerItem[],
    now: number,
): void {
    const upsert = conn.prepare(
        `INSERT INTO plugin_inventory (account_hash, rsn, container_kind, slot, item_id, item_name, qty, unit_price_gp, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, container_kind, slot) DO UPDATE SET
            rsn = excluded.rsn,
            item_id = excluded.item_id,
            item_name = excluded.item_name,
            qty = excluded.qty,
            unit_price_gp = COALESCE(excluded.unit_price_gp, unit_price_gp),
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN item_id != excluded.item_id OR qty != excluded.qty
                THEN excluded.updated_at ELSE updated_at END`,
    );
    const keptSlots: number[] = [];
    for (const it of items) {
        if (typeof it.id !== "number" || it.id <= 0) continue;
        const qty = typeof it.qty === "number" ? it.qty : 0;
        if (qty <= 0) continue;
        const slot = typeof it.slot === "number" ? it.slot : -1;
        if (slot < 0) continue;
        keptSlots.push(slot);
        upsert.run(accountHash, rsn ?? "", containerKind, slot, it.id, itemName(it), qty, itemPrice(it), now, now, now);
    }
    deleteMissingInvSlots(conn, accountHash, containerKind, keptSlots);
}

function deleteMissingInvSlots(
    conn: Database.Database,
    accountHash: string,
    containerKind: string,
    keepSlots: number[],
): void {
    if (keepSlots.length === 0) {
        conn.prepare(`DELETE FROM plugin_inventory WHERE account_hash = ? AND container_kind = ?`).run(
            accountHash,
            containerKind,
        );
        return;
    }
    const ph = keepSlots.map(() => "?").join(",");
    conn.prepare(
        `DELETE FROM plugin_inventory WHERE account_hash = ? AND container_kind = ? AND slot NOT IN (${ph})`,
    ).run(accountHash, containerKind, ...keepSlots);
}

// ── EQUIPMENT (slot-name-keyed) ──────────────────────────────────────

function snapshotEquipment(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    items: ContainerItem[],
    now: number,
): void {
    const upsert = conn.prepare(
        `INSERT INTO plugin_equipment (account_hash, rsn, slot, item_id, item_name, qty, unit_price_gp, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, slot) DO UPDATE SET
            rsn = excluded.rsn,
            item_id = excluded.item_id,
            item_name = excluded.item_name,
            qty = excluded.qty,
            unit_price_gp = COALESCE(excluded.unit_price_gp, unit_price_gp),
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN item_id != excluded.item_id OR qty != excluded.qty
                THEN excluded.updated_at ELSE updated_at END`,
    );
    const keptSlots: string[] = [];
    for (const it of items) {
        if (typeof it.id !== "number" || it.id <= 0) continue;
        const qty = typeof it.qty === "number" ? it.qty : 0;
        if (qty <= 0) continue;
        const slotName = typeof it.slot === "number" ? EQUIPMENT_SLOTS[it.slot] : undefined;
        if (!slotName) continue;
        keptSlots.push(slotName);
        upsert.run(accountHash, rsn ?? "", slotName, it.id, itemName(it), qty, itemPrice(it), now, now, now);
    }
    if (keptSlots.length === 0) {
        conn.prepare(`DELETE FROM plugin_equipment WHERE account_hash = ?`).run(accountHash);
    } else {
        const ph = keptSlots.map(() => "?").join(",");
        conn.prepare(`DELETE FROM plugin_equipment WHERE account_hash = ? AND slot NOT IN (${ph})`).run(
            accountHash,
            ...keptSlots,
        );
    }
}

// ── SEED VAULT (account-scoped item set) ─────────────────────────────

function snapshotSeedVault(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    items: ContainerItem[],
    now: number,
): void {
    const agg = aggregateById(items);
    const upsert = conn.prepare(
        `INSERT INTO plugin_seed_vault (account_hash, rsn, item_id, item_name, qty, unit_price_gp, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, item_id) DO UPDATE SET
            rsn = excluded.rsn,
            item_name = excluded.item_name,
            qty = excluded.qty,
            unit_price_gp = COALESCE(excluded.unit_price_gp, unit_price_gp),
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN qty != excluded.qty OR item_name != excluded.item_name
                THEN excluded.updated_at ELSE updated_at END`,
    );
    for (const [id, e] of agg) {
        upsert.run(accountHash, rsn ?? "", id, e.name, e.qty, e.price, now, now, now);
    }
    const ids = [...agg.keys()];
    if (ids.length === 0) {
        conn.prepare(`DELETE FROM plugin_seed_vault WHERE account_hash = ?`).run(accountHash);
    } else {
        const ph = ids.map(() => "?").join(",");
        conn.prepare(`DELETE FROM plugin_seed_vault WHERE account_hash = ? AND item_id NOT IN (${ph})`).run(
            accountHash,
            ...ids,
        );
    }
}

// ── snapshot dispatch ────────────────────────────────────────────────

export function handleContainer(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    _envelope: EventEnvelopeCols,
): void {
    const containerId = typeof payload.containerId === "string" ? payload.containerId : null;
    const items: ContainerItem[] = Array.isArray(payload.items) ? payload.items : [];
    if (containerId === null) return;
    conn.transaction(() => {
        upsertItemsCatalog(conn, items, now);
        if (containerId === INVENTORY) {
            snapshotInventory(conn, accountHash, rsn, KIND_MAIN, items, now);
        } else if (containerId === EQUIPMENT) {
            snapshotEquipment(conn, accountHash, rsn, items, now);
        } else if (containerId === SEED_VAULT) {
            snapshotSeedVault(conn, accountHash, rsn, items, now);
        }
    })();
}

// ── change-log inserts (id-based, with cause) ────────────────────────

function insertInventoryChange(
    insert: Database.Statement,
    accountHash: string,
    rsn: string | null,
    containerKind: string,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    c: ContainerItem,
    cause: { action?: string; option?: string; target?: string; id?: number } | undefined,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "inventory_change",
        containerKind,
        c.id,
        c.qty,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    insert.run(
        accountHash,
        rsn ?? "",
        envelope.session_id,
        envelope.session_seq,
        envelope.event_received_at,
        envelope.plugin_version,
        c.id,
        itemName(c),
        containerKind,
        c.qty,
        itemPrice(c),
        cause?.action ?? null,
        cause?.option ?? null,
        cause?.target ?? null,
        cause?.id ?? null,
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

function insertEquipmentChange(
    insert: Database.Statement,
    accountHash: string,
    rsn: string | null,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    c: ContainerItem,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "equipment_change",
        c.id,
        c.qty,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    insert.run(
        accountHash,
        rsn ?? "",
        envelope.session_id,
        envelope.session_seq,
        envelope.event_received_at,
        envelope.plugin_version,
        c.id,
        itemName(c),
        c.qty,
        itemPrice(c),
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

function insertSeedVaultChange(
    insert: Database.Statement,
    accountHash: string,
    rsn: string | null,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    c: ContainerItem,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "seed_vault_change",
        c.id,
        c.qty,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    insert.run(
        accountHash,
        rsn ?? "",
        envelope.session_id,
        envelope.session_seq,
        envelope.event_received_at,
        envelope.plugin_version,
        c.id,
        itemName(c),
        c.qty,
        itemPrice(c),
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

// ── delta dispatch (change-log only; state is snapshot-driven) ───────

const INVENTORY_CHANGE_SQL = `INSERT INTO plugin_inventory_changes
    (account_hash, rsn, session_id, session_seq, event_received_at,
     plugin_version, item_id, item_name, container_kind, qty_signed, unit_price_gp,
     cause_action, cause_option, cause_target, cause_target_id,
     world, x, y, plane, region_id, region_name, area, dedup_hash)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ON CONFLICT(dedup_hash) DO NOTHING`;

const EQUIPMENT_CHANGE_SQL = `INSERT INTO plugin_equipment_changes
    (account_hash, rsn, session_id, session_seq, event_received_at,
     plugin_version, item_id, item_name, qty_signed, unit_price_gp,
     world, x, y, plane, region_id, region_name, area, dedup_hash)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ON CONFLICT(dedup_hash) DO NOTHING`;

const SEED_VAULT_CHANGE_SQL = `INSERT INTO plugin_seed_vault_changes
    (account_hash, rsn, session_id, session_seq, event_received_at,
     plugin_version, item_id, item_name, qty_signed, unit_price_gp,
     world, x, y, plane, region_id, region_name, area, dedup_hash)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ON CONFLICT(dedup_hash) DO NOTHING`;

function isLiveChange(c: ContainerItem): boolean {
    return typeof c.id === "number" && c.id > 0 && typeof c.qty === "number" && c.qty !== 0;
}

export function handleContainerDelta(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const containerId = typeof payload.containerId === "string" ? payload.containerId : null;
    const changes: ContainerItem[] = Array.isArray(payload.changes) ? payload.changes : [];
    const cause = payload.cause;
    if (containerId === null || changes.length === 0) return;
    const where = extractWhere(payload);
    upsertItemsCatalog(conn, changes, now);

    if (containerId === INVENTORY) {
        const insert = conn.prepare(INVENTORY_CHANGE_SQL);
        conn.transaction(() => {
            for (const c of changes) {
                if (isLiveChange(c))
                    insertInventoryChange(insert, accountHash, rsn, KIND_MAIN, envelope, where, c, cause);
            }
        })();
    } else if (containerId === EQUIPMENT) {
        const insert = conn.prepare(EQUIPMENT_CHANGE_SQL);
        conn.transaction(() => {
            for (const c of changes) {
                if (isLiveChange(c)) insertEquipmentChange(insert, accountHash, rsn, envelope, where, c);
            }
        })();
    } else if (containerId === SEED_VAULT) {
        const insert = conn.prepare(SEED_VAULT_CHANGE_SQL);
        conn.transaction(() => {
            for (const c of changes) {
                if (isLiveChange(c)) insertSeedVaultChange(insert, accountHash, rsn, envelope, where, c);
            }
        })();
    }
}

export function handleRunePouch(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    _envelope: EventEnvelopeCols,
): void {
    const slots: RunePouchSlot[] = Array.isArray(payload.slots) ? payload.slots : [];
    const items: ContainerItem[] = slots
        .filter((s) => typeof s.itemId === "number" && typeof s.qty === "number")
        .map((s) => ({ id: s.itemId, qty: s.qty, name: s.name, price: s.price, slot: s.slot }));
    conn.transaction(() => {
        upsertItemsCatalog(conn, items, now);
        snapshotInventory(conn, accountHash, rsn, KIND_RUNE_POUCH, items, now);
    })();
}
