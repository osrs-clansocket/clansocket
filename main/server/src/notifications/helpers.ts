import { DB_NAMES, getDb } from "../database/index.js";

export interface NotificationRow {
    id: number;
    site_account_id: string;
    kind: string;
    title: string;
    body: string;
    href: string | null;
    dismissed: number;
    created_at: number;
}

export interface NewNotification {
    siteAccountId: string;
    kind: string;
    title: string;
    body: string;
    href?: string | null;
}

export function insertNotification(args: NewNotification): number {
    const db = getDb(DB_NAMES.APP);
    const result = db
        .prepare(
            `INSERT INTO clansocket_notifications (site_account_id, kind, title, body, href, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(args.siteAccountId, args.kind, args.title, args.body, args.href ?? null, Date.now());
    return Number(result.lastInsertRowid);
}

export function listUndismissed(siteAccountId: string): NotificationRow[] {
    const db = getDb(DB_NAMES.APP);
    return db
        .prepare(
            `SELECT id, site_account_id, kind, title, body, href, dismissed, created_at
             FROM clansocket_notifications
             WHERE site_account_id = ? AND dismissed = 0
             ORDER BY created_at DESC`,
        )
        .all(siteAccountId) as NotificationRow[];
}

export interface NotificationView {
    id: number;
    kind: string;
    title: string;
    body: string;
    href: string | null;
    createdAt: number;
}

export function listNotificationViews(siteAccountId: string): NotificationView[] {
    return listUndismissed(siteAccountId).map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        href: r.href,
        createdAt: r.created_at,
    }));
}

export function dismissNotification(id: number, siteAccountId: string): boolean {
    const db = getDb(DB_NAMES.APP);
    const result = db
        .prepare(
            `UPDATE clansocket_notifications SET dismissed = 1
             WHERE id = ? AND site_account_id = ? AND dismissed = 0`,
        )
        .run(id, siteAccountId);
    return result.changes > 0;
}

export function hasRecentNotificationForClan(
    siteAccountId: string,
    kind: string,
    clanSlug: string,
    sinceMs: number,
): boolean {
    const db = getDb(DB_NAMES.APP);
    const cutoff = Date.now() - sinceMs;
    const href = `/clans/${clanSlug}`;
    const row = db
        .prepare(
            `SELECT 1 AS one FROM clansocket_notifications
             WHERE site_account_id = ? AND kind = ? AND href = ? AND created_at >= ?
             LIMIT 1`,
        )
        .get(siteAccountId, kind, href, cutoff) as { one: number } | undefined;
    return row !== undefined;
}
