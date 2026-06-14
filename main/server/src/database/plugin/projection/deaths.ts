import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import type { SpatialColumns } from "./helpers.js";
import { type Payload } from "./helpers.js";

function flatWhere(payload: Payload): SpatialColumns {
    return {
        world: typeof payload.world === "number" ? payload.world : null,
        x: typeof payload.x === "number" ? payload.x : null,
        y: typeof payload.y === "number" ? payload.y : null,
        plane: typeof payload.plane === "number" ? payload.plane : null,
        region_id: typeof payload.regionId === "number" ? payload.regionId : null,
        region_name: typeof payload.regionName === "string" ? payload.regionName : null,
        area: typeof payload.area === "string" ? payload.area : null,
    };
}

interface LostItem {
    id?: number;
    itemId?: number;
    name?: string;
    itemName?: string;
    qty?: number;
    quantity?: number;
    price?: number;
}

function readLostItems(payload: Payload): LostItem[] {
    const items = payload.lostItems ?? payload.items;
    return Array.isArray(items) ? items : [];
}

export function handleDeath(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    _now: number,
    envelope: EventEnvelopeCols,
): void {
    const where = flatWhere(payload);
    const causeKind = typeof payload.causeKind === "string" ? payload.causeKind : "UNKNOWN";
    const causeId = typeof payload.causeId === "number" ? payload.causeId : null;
    const causeName = causeKind === "PLAYER" ? null : typeof payload.causeName === "string" ? payload.causeName : null;
    const causeCombatLevel =
        causeKind === "PLAYER" || causeKind === "ENVIRONMENT"
            ? null
            : typeof payload.causeCombatLevel === "number"
              ? payload.causeCombatLevel
              : null;
    const causeCategory = typeof payload.causeCategory === "string" ? payload.causeCategory : null;
    const hpBefore = typeof payload.hpBefore === "number" ? payload.hpBefore : null;
    const respawnX = typeof payload.respawnX === "number" ? payload.respawnX : null;
    const respawnY = typeof payload.respawnY === "number" ? payload.respawnY : null;
    const respawnPlane = typeof payload.respawnPlane === "number" ? payload.respawnPlane : null;
    const respawnRegionId = typeof payload.respawnRegionId === "number" ? payload.respawnRegionId : null;
    const respawnRegionName = typeof payload.respawnRegionName === "string" ? payload.respawnRegionName : null;
    const respawnArea = typeof payload.respawnArea === "string" ? payload.respawnArea : null;
    const dedup = rowDedupHash(
        accountHash,
        "death",
        causeKind,
        causeId ?? 0,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    conn.transaction(() => {
        const result = conn
            .prepare(
                `INSERT INTO plugin_deaths
                (account_hash, rsn, session_id, session_seq, event_received_at,
                 plugin_version, cause_kind, cause_id, cause_name, cause_combat_level,
                 cause_category, hp_before, world, x, y, plane, region_id, region_name, area,
                 respawn_x, respawn_y, respawn_plane, respawn_region_id,
                 respawn_region_name, respawn_area, dedup_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(dedup_hash) DO NOTHING`,
            )
            .run(
                accountHash,
                rsn ?? "",
                envelope.session_id,
                envelope.session_seq,
                envelope.event_received_at,
                envelope.plugin_version,
                causeKind,
                causeId,
                causeName,
                causeCombatLevel,
                causeCategory,
                hpBefore,
                where.world ?? 0,
                where.x ?? 0,
                where.y ?? 0,
                where.plane ?? 0,
                where.region_id ?? 0,
                where.region_name ?? "",
                where.area,
                respawnX,
                respawnY,
                respawnPlane,
                respawnRegionId,
                respawnRegionName,
                respawnArea,
                dedup,
            );
        const deathId = result.lastInsertRowid;
        if (typeof deathId !== "number") return;
        const lostItems = readLostItems(payload);
        if (lostItems.length === 0) return;
        const insertLost = conn.prepare(
            `INSERT INTO plugin_deaths_lost_items (death_id, item_id, item_name, qty, unit_price_gp)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (death_id, item_id) DO UPDATE SET
                qty = plugin_deaths_lost_items.qty + excluded.qty,
                item_name = excluded.item_name,
                unit_price_gp = COALESCE(excluded.unit_price_gp, unit_price_gp)`,
        );
        for (const item of lostItems) {
            const itemId = typeof item.id === "number" ? item.id : typeof item.itemId === "number" ? item.itemId : null;
            if (itemId === null) continue;
            const itemName =
                typeof item.name === "string" ? item.name : typeof item.itemName === "string" ? item.itemName : "";
            const qty = typeof item.qty === "number" ? item.qty : typeof item.quantity === "number" ? item.quantity : 0;
            const price = typeof item.price === "number" && item.price > 0 ? item.price : null;
            insertLost.run(deathId, itemId, itemName, qty, price);
        }
    })();
}
