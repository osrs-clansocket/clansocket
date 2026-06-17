import type Database from "better-sqlite3";
import type { EventEnvelopeCols } from "./envelope.js";
import { rowDedupHash } from "./envelope.js";
import { extractWhere, type Payload } from "./helpers.js";

interface PrayerEntry {
    id: number;
    name?: string;
}

interface PriorPrayerRow {
    prayer_id: number;
    prayer_name: string;
    active: number;
}

export function clearActivePrayers(conn: Database.Database, accountHash: string, now: number): void {
    conn.prepare("UPDATE plugin_prayers SET active = 0, updated_at = ? WHERE account_hash = ? AND active = 1").run(
        now,
        accountHash,
    );
}

function readPriorActivePrayers(conn: Database.Database, accountHash: string): Map<number, string> {
    const rows = conn
        .prepare("SELECT prayer_id, prayer_name, active FROM plugin_prayers WHERE account_hash = ? AND active = 1")
        .all(accountHash) as PriorPrayerRow[];
    return new Map(rows.map((r) => [r.prayer_id, r.prayer_name]));
}

function upsertPrayer(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    prayerId: number,
    prayerName: string,
    active: number,
    now: number,
): void {
    conn.prepare(
        `INSERT INTO plugin_prayers (account_hash, rsn, prayer_id, prayer_name, active, first_seen, last_seen, updated_at)
         VALUES ($accountHash, $rsn, $prayerId, $prayerName, $active, $now, $now, $now)
         ON CONFLICT (account_hash, prayer_id) DO UPDATE SET
            rsn = excluded.rsn,
            prayer_name = excluded.prayer_name,
            active = excluded.active,
            last_seen = excluded.last_seen,
            updated_at = CASE
                WHEN active != excluded.active OR prayer_name != excluded.prayer_name
                THEN excluded.updated_at
                ELSE updated_at
            END`,
    ).run({ accountHash, rsn: rsn ?? "", prayerId, prayerName, active, now });
}

function insertPrayerChange(
    insert: Database.Statement,
    accountHash: string,
    rsn: string | null,
    envelope: EventEnvelopeCols,
    where: ReturnType<typeof extractWhere>,
    prayerId: number,
    prayerName: string,
    qtySigned: number,
): void {
    const dedup = rowDedupHash(
        accountHash,
        "prayer_change",
        prayerId,
        qtySigned,
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
        prayerId,
        prayerName,
        qtySigned,
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

export function handlePrayers(
    conn: Database.Database,
    accountHash: string,
    rsn: string | null,
    payload: Payload,
    now: number,
    envelope: EventEnvelopeCols,
): void {
    const active: PrayerEntry[] = Array.isArray(payload.active) ? payload.active : [];
    const where = extractWhere(payload);
    const insertChange = conn.prepare(
        `INSERT INTO plugin_prayers_changes
            (account_hash, rsn, session_id, session_seq, event_received_at,
             plugin_version, prayer_id, prayer_name, qty_signed,
             world, x, y, plane, region_id, region_name, area, dedup_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    conn.transaction(() => {
        const priorActive = readPriorActivePrayers(conn, accountHash);
        const incomingActive = new Map<number, string>();
        for (const p of active) {
            if (typeof p.id !== "number") continue;
            incomingActive.set(p.id, typeof p.name === "string" ? p.name : "");
        }
        for (const [prayerId, prayerName] of incomingActive) {
            if (!priorActive.has(prayerId)) {
                insertPrayerChange(insertChange, accountHash, rsn, envelope, where, prayerId, prayerName, 1);
            }
            upsertPrayer(conn, accountHash, rsn, prayerId, prayerName, 1, now);
        }
        for (const [prayerId, prayerName] of priorActive) {
            if (!incomingActive.has(prayerId)) {
                insertPrayerChange(insertChange, accountHash, rsn, envelope, where, prayerId, prayerName, -1);
                upsertPrayer(conn, accountHash, rsn, prayerId, prayerName, 0, now);
            }
        }
    })();
}
