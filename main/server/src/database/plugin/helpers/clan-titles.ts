import { createHash } from "node:crypto";
import { getClanDb } from "../../core/database.js";
import { getClanById } from "../../clans/clan-app-helpers.js";

export interface PluginClanTitleEntry {
    rank: number;
    titleId: number;
    title: string;
}

export interface PluginClanTitlesSnapshotRecord {
    clanId: string;
    clanName: string;
    accountHash: string;
    rsn: string;
    titles: readonly PluginClanTitleEntry[];
    observedAt: number;
    sessionId?: string;
    pluginVersion?: string;
    schemaVersion?: number;
}

interface CurrentTitleRow {
    rank_position: number;
    title_id: number;
    title_name: string;
}

export interface ClanTitleLadderEntry {
    rank: number;
    title: string;
    titleId: number;
}

function titleDedupHash(
    accountHash: string,
    clanId: string,
    rankPosition: number,
    newTitleId: number,
    observedAt: number,
): string {
    return createHash("sha1")
        .update(`${accountHash}|clan_titles_history|${clanId}|${rankPosition}|${newTitleId}|${observedAt}`)
        .digest("hex");
}

export function recordPluginClanTitlesSnapshot(clanId: string, record: PluginClanTitlesSnapshotRecord): number {
    const db = getClanDb(clanId);
    const currentRows = db
        .prepare("SELECT rank_position, title_id, title_name FROM clan_titles_current WHERE clan_id = ?")
        .all(record.clanId) as CurrentTitleRow[];
    const currentMap = new Map<number, { titleId: number; titleName: string }>();
    for (const r of currentRows) currentMap.set(r.rank_position, { titleId: r.title_id, titleName: r.title_name });

    const insertHistory = db.prepare(
        `INSERT INTO clan_titles_history
            (account_hash, rsn, session_id, session_seq,
             event_received_at, plugin_version,
             clan_id, clan_name, rank_position,
             old_title_id, old_title_name, new_title_id, new_title_name,
             world, x, y, plane, region_id, region_name, area,
             dedup_hash)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?)
         ON CONFLICT(dedup_hash) DO NOTHING`,
    );
    const upsertCurrent = db.prepare(
        `INSERT INTO clan_titles_current
            (account_hash, rsn, clan_id, clan_name, rank_position, title_id, title_name, observed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(clan_id, rank_position) DO UPDATE SET
            account_hash = excluded.account_hash,
            rsn = excluded.rsn,
            clan_name = excluded.clan_name,
            title_id = excluded.title_id,
            title_name = excluded.title_name,
            observed_at = excluded.observed_at`,
    );

    const sessionId = record.sessionId ?? "snapshot";
    const pluginVersion = record.pluginVersion ?? "unknown";

    let changes = 0;
    db.transaction(() => {
        for (const t of record.titles) {
            const cur = currentMap.get(t.rank);
            const isNew = cur === undefined;
            const isChanged = !isNew && (cur.titleId !== t.titleId || cur.titleName !== t.title);
            if (isNew || isChanged) {
                const oldTitleId = cur?.titleId ?? null;
                const oldTitleName = cur?.titleName ?? null;
                const dedup = titleDedupHash(record.accountHash, record.clanId, t.rank, t.titleId, record.observedAt);
                insertHistory.run(
                    record.accountHash,
                    record.rsn,
                    sessionId,
                    record.observedAt,
                    pluginVersion,
                    record.clanId,
                    record.clanName,
                    t.rank,
                    oldTitleId,
                    oldTitleName,
                    t.titleId,
                    t.title,
                    dedup,
                );
                upsertCurrent.run(
                    record.accountHash,
                    record.rsn,
                    record.clanId,
                    record.clanName,
                    t.rank,
                    t.titleId,
                    t.title,
                    record.observedAt,
                );
                changes++;
            }
        }
    })();
    return changes;
}

export function listClanTitleLadder(clanId: string): ClanTitleLadderEntry[] {
    if (!getClanById(clanId)) return [];
    const rows = getClanDb(clanId)
        .prepare(
            `SELECT rank_position, title_id, title_name
             FROM clan_titles_current WHERE clan_id = ?
             ORDER BY rank_position DESC`,
        )
        .all(clanId) as { rank_position: number; title_id: number; title_name: string }[];
    return rows.map((r) => ({ rank: r.rank_position, title: r.title_name, titleId: r.title_id }));
}
