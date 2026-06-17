import { getClanDb } from "../../core/database.js";

export interface WomAccountRow {
    accountHash: string;
    rsn: string;
    accountType: string;
    lastChangedAtMs: number;
}

const UPSERT_SQL = `INSERT INTO clan_accounts (
    account_hash, first_rsn, latest_rsn,
    account_type, account_type_source, account_type_updated_at,
    first_seen, last_seen
) VALUES ($accountHash, $rsn, $rsn, $accountType, 'wom', $changedAt, $now, $now)
ON CONFLICT(account_hash) DO UPDATE SET
    latest_rsn = excluded.latest_rsn,
    account_type = CASE
        WHEN clan_accounts.account_type_updated_at IS NOT NULL
            AND clan_accounts.account_type_updated_at >= excluded.account_type_updated_at
        THEN clan_accounts.account_type
        ELSE excluded.account_type
    END,
    account_type_source = CASE
        WHEN clan_accounts.account_type_updated_at IS NOT NULL
            AND clan_accounts.account_type_updated_at >= excluded.account_type_updated_at
        THEN COALESCE(clan_accounts.account_type_source, 'plugin')
        ELSE 'wom'
    END,
    account_type_updated_at = CASE
        WHEN clan_accounts.account_type_updated_at IS NOT NULL
            AND clan_accounts.account_type_updated_at >= excluded.account_type_updated_at
        THEN clan_accounts.account_type_updated_at
        ELSE excluded.account_type_updated_at
    END,
    last_seen = excluded.last_seen`;

export function saturateAccountsFromWom(clanId: string, _mode: string, rows: readonly WomAccountRow[]): number {
    if (rows.length === 0) return 0;
    const db = getClanDb(clanId);
    const stmt = db.prepare(UPSERT_SQL);
    const now = Date.now();
    db.transaction(() => {
        for (const row of rows) {
            stmt.run({
                accountHash: row.accountHash,
                rsn: row.rsn,
                accountType: row.accountType,
                changedAt: row.lastChangedAtMs > 0 ? row.lastChangedAtMs : now,
                now,
            });
        }
    })();
    return rows.length;
}
