import type Database from "better-sqlite3";
import logger from "@clansocket/logger";
import { decodeFarmingPatch, classifyFarmingDecode, type FarmingDecodeInput } from "@clansocket/farm";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

interface PriorFarming {
    state: string;
}

function readPriorState(
    conn: Database.Database,
    accountHash: string,
    patchRegionId: number,
    varbitId: number,
): string | null {
    const row = conn
        .prepare(
            `SELECT state FROM plugin_farming
             WHERE account_hash = ? AND patch_region_id = ? AND varbit_id = ?`,
        )
        .get(accountHash, patchRegionId, varbitId) as PriorFarming | undefined;
    return row?.state ?? null;
}

function logFarmingDecodeMiss(input: FarmingDecodeInput): void {
    const miss = classifyFarmingDecode(input);
    if (miss === null || miss === "out-of-bounds") return;
    logger.warn(
        `farming decode miss (${miss}): varbit=${input.varbitId} value=${input.value} region=${input.regionId} x=${input.x} y=${input.y} plane=${input.plane}`,
    );
}

export function handleFarmingPatch(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const varbitId = typeof payload.varbitId === "number" ? payload.varbitId : null;
    const value = typeof payload.value === "number" ? payload.value : null;
    if (varbitId === null || value === null) return;
    const where = extractWhere(payload);
    if (where.region_id === null || where.x === null || where.y === null || where.plane === null) return;
    const decodeInput: FarmingDecodeInput = {
        varbitId,
        value,
        regionId: where.region_id,
        x: where.x,
        y: where.y,
        plane: where.plane,
    };
    const decoded = decodeFarmingPatch(decodeInput);
    if (decoded === null) {
        logFarmingDecodeMiss(decodeInput);
        return;
    }
    const { patchRegionId, patchRegionName, cropId, cropName, state } = decoded;
    conn.transaction(() => {
        const prior = readPriorState(conn, accountHash, patchRegionId, varbitId);
        if (prior !== null && prior !== state) {
            const dedup = rowDedupHash(
                accountHash,
                "farming_change",
                patchRegionId,
                varbitId,
                prior,
                state,
                envelope.session_seq,
                where.world ?? 0,
                where.x ?? 0,
                where.y ?? 0,
                where.plane ?? 0,
            );
            conn.prepare(
                `INSERT INTO plugin_farming_changes
                    (account_hash, rsn, session_id, session_seq, event_received_at,
                     plugin_version, patch_region_id, patch_region_name, varbit_id,
                     crop_id, crop_name, state_before, state_after,
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
                patchRegionId,
                patchRegionName,
                varbitId,
                cropId,
                cropName,
                prior,
                state,
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
        conn.prepare(
            `INSERT INTO plugin_farming
                (account_hash, rsn, patch_region_id, patch_region_name, varbit_id,
                 crop_id, crop_name, value, state, first_seen, last_seen, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (account_hash, patch_region_id, varbit_id) DO UPDATE SET
                rsn = excluded.rsn,
                patch_region_name = excluded.patch_region_name,
                crop_id = COALESCE(excluded.crop_id, crop_id),
                crop_name = COALESCE(excluded.crop_name, crop_name),
                value = excluded.value,
                state = excluded.state,
                last_seen = excluded.last_seen,
                updated_at = CASE
                    WHEN state != excluded.state OR value != excluded.value
                    THEN excluded.updated_at
                    ELSE updated_at
                END`,
        ).run(
            accountHash,
            rsn ?? "",
            patchRegionId,
            patchRegionName,
            varbitId,
            cropId,
            cropName,
            value,
            state,
            now,
            now,
            now,
        );
    })();
}
