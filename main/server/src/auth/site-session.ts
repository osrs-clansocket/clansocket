import { randomBytes } from "node:crypto";
import { getDb, DB_NAMES } from "../database/core/database.js";
import { MS_PER_DAY } from "../shared/time.js";

const SESSION_TTL_MS = 30 * MS_PER_DAY;
const ID_BYTE_LENGTH = 32;

export interface SiteSession {
    id: string;
    siteAccountId: string;
    expiresAt: number;
}

function toSession(id: string, siteAccountId: string, expiresAt: number): SiteSession {
    return { id, siteAccountId, expiresAt };
}

export function mintSiteSession(siteAccountId: string): SiteSession {
    const id = randomBytes(ID_BYTE_LENGTH).toString("base64url");
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;
    const db = getDb(DB_NAMES.APP);
    db.prepare(
        `INSERT INTO clansocket_oauth_sessions (id, site_account_id, created_at, expires_at, last_used_at)
         VALUES (?, ?, ?, ?, ?)`,
    ).run(id, siteAccountId, now, expiresAt, now);
    return toSession(id, siteAccountId, expiresAt);
}

export function verifySiteSession(id: string | undefined | null): SiteSession | null {
    if (typeof id !== "string" || id.length === 0) return null;
    const db = getDb(DB_NAMES.APP);
    const row = db
        .prepare(`SELECT id, site_account_id, expires_at, revoked_at FROM clansocket_oauth_sessions WHERE id = ?`)
        .get(id) as { id: string; site_account_id: string; expires_at: number; revoked_at: number | null } | undefined;
    if (!row) return null;
    if (row.revoked_at !== null) return null;
    if (row.expires_at < Date.now()) return null;
    db.prepare(`UPDATE clansocket_oauth_sessions SET last_used_at = ? WHERE id = ?`).run(Date.now(), id);
    return toSession(row.id, row.site_account_id, row.expires_at);
}

export function revokeSiteSession(id: string): void {
    const db = getDb(DB_NAMES.APP);
    db.prepare(`UPDATE clansocket_oauth_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`).run(
        Date.now(),
        id,
    );
}

export function revokeAllSessionsForAccount(siteAccountId: string): number {
    const db = getDb(DB_NAMES.APP);
    const result = db
        .prepare(`UPDATE clansocket_oauth_sessions SET revoked_at = ? WHERE site_account_id = ? AND revoked_at IS NULL`)
        .run(Date.now(), siteAccountId);
    return result.changes;
}
