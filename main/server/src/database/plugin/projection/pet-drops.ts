import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

export function handlePetDrop(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    _now: number,
    envelope: EventEnvelopeCols,
): void {
    const where = extractWhere(payload);
    const petItemId = typeof payload.petItemId === "number" ? payload.petItemId : null;
    const petItemName = typeof payload.petName === "string" ? payload.petName : null;
    const trigger = typeof payload.trigger === "string" ? payload.trigger : "unknown";
    const message = typeof payload.message === "string" ? payload.message : "";
    const sourceKind = typeof payload.sourceKind === "string" ? payload.sourceKind : null;
    const sourceId = typeof payload.sourceId === "number" ? payload.sourceId : null;
    const sourceName =
        sourceKind === "PLAYER" ? null : typeof payload.sourceName === "string" ? payload.sourceName : null;
    const dedup = rowDedupHash(
        accountHash,
        "pet_drop",
        petItemId ?? 0,
        trigger,
        envelope.session_seq,
        where.world ?? 0,
        where.x ?? 0,
        where.y ?? 0,
        where.plane ?? 0,
    );
    conn.prepare(
        `INSERT INTO plugin_pet_drops
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, pet_item_id, pet_item_name, trigger, message,
             source_kind, source_id, source_name,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    ).run(
        accountHash,
        rsn ?? "",
        envelope.session_id,
        envelope.session_seq,
        envelope.event_received_at,
        envelope.plugin_version,
        petItemId,
        petItemName,
        trigger,
        message,
        sourceKind,
        sourceId,
        sourceName,
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
