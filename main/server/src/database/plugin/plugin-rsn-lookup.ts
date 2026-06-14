import type Database from "better-sqlite3";
import { DB_NAMES, getDb } from "../core/database.js";

export function lookupRsnForHash(conn: Database.Database, accountHash: string): string | null {
    const row = conn.prepare("SELECT latest_rsn FROM plugin_accounts WHERE account_hash = ?").get(accountHash) as
        | { latest_rsn: string }
        | undefined;
    return row?.latest_rsn ?? null;
}

export function lookupVerifiedRsnForHash(accountHash: string): string | null {
    const row = getDb(DB_NAMES.APP)
        .prepare(
            `SELECT rsn FROM clansocket_account_rsns
             WHERE account_hash = ?
             ORDER BY last_seen DESC
             LIMIT 1`,
        )
        .get(accountHash) as { rsn: string } | undefined;
    return row?.rsn ?? null;
}
