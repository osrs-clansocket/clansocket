import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";
import { upsertItemsCatalog } from "./items-catalog.js";

interface LootItem {
    id: number;
    qty: number;
    name?: string;
    price?: number;
}

function reconcileNpcKc(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    sourceKind: string,
    sourceId: number | null,
    sourceName: string | null,
    kc: number | null,
    now: number,
): void {
    if (sourceKind !== "NPC" || sourceId === null || sourceName === null || kc === null) return;
    conn.prepare(
        `INSERT INTO plugin_npc_kc (account_hash, rsn, source_id, source_name, kc, first_seen, last_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_hash, source_id) DO UPDATE SET
            rsn = excluded.rsn,
            source_name = excluded.source_name,
            kc = excluded.kc,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN kc != excluded.kc OR source_name != excluded.source_name
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run(accountHash, rsn ?? "", sourceId, sourceName, kc, now, now, now);
}

export function handleLoot(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const items: LootItem[] = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) return;
    const where = extractWhere(payload);
    const causeKind = typeof payload.sourceType === "string" ? payload.sourceType : "UNKNOWN";
    const causeId = typeof payload.sourceId === "number" ? payload.sourceId : null;
    const causeName = causeKind === "PLAYER" ? null : typeof payload.source === "string" ? payload.source : null;
    const causeCombatLevel =
        causeKind === "PLAYER" || causeKind === "ENVIRONMENT"
            ? null
            : typeof payload.sourceLevel === "number"
              ? payload.sourceLevel
              : null;
    const kc = typeof payload.kc === "number" ? payload.kc : null;
    const insert = conn.prepare(
        `INSERT INTO plugin_loot_drops
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, item_id, item_name, qty, unit_price_gp,
             cause_kind, cause_id, cause_name, cause_combat_level, kc,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        upsertItemsCatalog(conn, items, now);
        for (const item of items) {
            if (typeof item.id !== "number" || typeof item.qty !== "number") continue;
            const itemName = typeof item.name === "string" ? item.name : "";
            const price = typeof item.price === "number" && item.price > 0 ? item.price : null;
            const dedup = rowDedupHash(
                accountHash,
                "loot_drop",
                causeKind,
                causeId ?? 0,
                item.id,
                item.qty,
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
                item.id,
                itemName,
                item.qty,
                price,
                causeKind,
                causeId,
                causeName,
                causeCombatLevel,
                kc,
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
        reconcileNpcKc(conn, accountHash, rsn, causeKind, causeId, causeName, kc, now);
    })();
}
