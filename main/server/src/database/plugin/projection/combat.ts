import type Database from "better-sqlite3";
import { ensureCurrentStateRow } from "./current-state.js";
import { BUCKET_MS, type Payload } from "./helpers.js";

export function handleDamageDealt(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    ensureCurrentStateRow(conn, accountHash, rsn, now);
    const amount = typeof payload.amount === "number" ? payload.amount : 0;
    const hitsplatId = typeof payload.hitsplatType === "number" ? payload.hitsplatType : null;
    const targetKind = typeof payload.targetKind === "string" ? payload.targetKind : null;
    const targetId = typeof payload.targetId === "number" ? payload.targetId : null;
    const targetName =
        targetKind === "PLAYER" ? null : typeof payload.targetName === "string" ? payload.targetName : null;
    const damageType =
        typeof payload.attackStyle === "string" && payload.attackStyle.length > 0 ? payload.attackStyle : "UNKNOWN";
    conn.prepare(
        `UPDATE plugin_current_state
            SET last_damage_dealt_at = $now, last_damage_dealt_amount = $amount,
                last_damage_dealt_hitsplat_id = $hitsplatId,
                last_damage_dealt_target_kind = $targetKind, last_damage_dealt_target_id = $targetId,
                last_damage_dealt_target_name = $targetName, last_seen = $now, updated_at = $now
            WHERE account_hash = $accountHash`,
    ).run({ now, amount, hitsplatId, targetKind, targetId, targetName, accountHash });
    const bucket = Math.floor(now / BUCKET_MS);
    const bucketTargetName = targetName ?? targetKind ?? "unknown";
    const bucketTargetId = targetId ?? 0;
    const bucketHitsplatId = hitsplatId ?? 0;
    conn.prepare(
        `INSERT INTO plugin_damage_buckets
            (account_hash, rsn, source_kind, source_id, source_name, target_kind, target_id, target_name, hitsplat_type, damage_type, minute_bucket, timestamp, dealt_total, hit_count_dealt)
         VALUES ($accountHash, $rsn, 'self', 0, '', $targetKind, $targetId, $targetName, $hitsplatId, $damageType, $bucket, $bucketTs, $amount, 1)
         ON CONFLICT (account_hash, source_kind, source_id, source_name, target_kind, target_id, target_name, hitsplat_type, damage_type, minute_bucket) DO UPDATE SET
            rsn = COALESCE(excluded.rsn, rsn),
            dealt_total = dealt_total + excluded.dealt_total,
            hit_count_dealt = hit_count_dealt + 1`,
    ).run({
        accountHash,
        rsn,
        targetKind: targetKind ?? "UNKNOWN",
        targetId: bucketTargetId,
        targetName: bucketTargetName,
        hitsplatId: bucketHitsplatId,
        damageType,
        bucket,
        bucketTs: bucket * BUCKET_MS,
        amount,
    });
}

export function handleDamageTaken(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    ensureCurrentStateRow(conn, accountHash, rsn, now);
    const amount = typeof payload.amount === "number" ? payload.amount : 0;
    const hitsplatId = typeof payload.hitsplatType === "number" ? payload.hitsplatType : null;
    const sourceKind = typeof payload.sourceKind === "string" ? payload.sourceKind : null;
    const sourceId = typeof payload.sourceId === "number" ? payload.sourceId : null;
    const sourceName =
        sourceKind === "PLAYER" ? null : typeof payload.sourceName === "string" ? payload.sourceName : null;
    conn.prepare(
        `UPDATE plugin_current_state
            SET last_damage_taken_at = $now, last_damage_taken_amount = $amount,
                last_damage_taken_hitsplat_id = $hitsplatId,
                last_damage_taken_source_kind = $sourceKind, last_damage_taken_source_id = $sourceId,
                last_damage_taken_source_name = $sourceName, last_seen = $now, updated_at = $now
            WHERE account_hash = $accountHash`,
    ).run({ now, amount, hitsplatId, sourceKind, sourceId, sourceName, accountHash });
    const bucket = Math.floor(now / BUCKET_MS);
    const bucketSourceName = sourceName ?? sourceKind ?? "unknown";
    const bucketSourceId = sourceId ?? 0;
    const bucketHitsplatId = hitsplatId ?? 0;
    conn.prepare(
        `INSERT INTO plugin_damage_buckets
            (account_hash, rsn, source_kind, source_id, source_name, target_kind, target_id, target_name, hitsplat_type, damage_type, minute_bucket, timestamp, taken_total, hit_count_taken)
         VALUES ($accountHash, $rsn, $sourceKind, $sourceId, $sourceName, 'self', 0, '', $hitsplatId, 'UNKNOWN', $bucket, $bucketTs, $amount, 1)
         ON CONFLICT (account_hash, source_kind, source_id, source_name, target_kind, target_id, target_name, hitsplat_type, damage_type, minute_bucket) DO UPDATE SET
            rsn = COALESCE(excluded.rsn, rsn),
            taken_total = taken_total + excluded.taken_total,
            hit_count_taken = hit_count_taken + 1`,
    ).run({
        accountHash,
        rsn,
        sourceKind: sourceKind ?? "UNKNOWN",
        sourceId: bucketSourceId,
        sourceName: bucketSourceName,
        hitsplatId: bucketHitsplatId,
        bucket,
        bucketTs: bucket * BUCKET_MS,
        amount,
    });
}
