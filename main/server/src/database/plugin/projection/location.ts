import type Database from "better-sqlite3";
import { ensureCurrentStateRow } from "./current-state.js";
import type { Payload } from "./helpers.js";

export function handleLocation(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
): void {
    ensureCurrentStateRow(conn, accountHash, rsn, now);
    const x = typeof payload.x === "number" ? payload.x : null;
    const y = typeof payload.y === "number" ? payload.y : null;
    const plane = typeof payload.plane === "number" ? payload.plane : null;
    const regionId =
        typeof payload.region === "number"
            ? payload.region
            : typeof payload.regionId === "number"
              ? payload.regionId
              : null;
    const regionName = typeof payload.regionName === "string" ? payload.regionName : null;
    conn.prepare(
        `UPDATE plugin_current_state
            SET location_x = ?, location_y = ?, location_plane = ?,
                location_region_id = ?, location_region_name = ?,
                last_seen = ?, updated_at = ?
            WHERE account_hash = ?`,
    ).run(x, y, plane, regionId, regionName, now, now, accountHash);
}
