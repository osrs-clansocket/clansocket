import { DB_NAMES, getDb } from "../../../database/index.js";

export interface PurgeUserResult {
    accountHash: string;
    siteAccountId: string;
    appTableDeletes: Record<string, number>;
    varezTableDeletes: Record<string, number>;
    discordTableDeletes: Record<string, number>;
    clansTouched: number;
    pluginRowDeletes: number;
    clanRowNulls: number;
    socketsClosed: number;
}

export function listAllClanIds(): string[] {
    const db = getDb(DB_NAMES.APP);
    return (db.prepare(`SELECT id FROM clansocket_clans`).all() as { id: string }[]).map((r) => r.id);
}

export function emptyResult(accountHash: string, siteAccountId: string): PurgeUserResult {
    return {
        accountHash,
        siteAccountId,
        appTableDeletes: {},
        varezTableDeletes: {},
        discordTableDeletes: {},
        clansTouched: 0,
        pluginRowDeletes: 0,
        clanRowNulls: 0,
        socketsClosed: 0,
    };
}
