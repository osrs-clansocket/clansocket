import { rmSync } from "node:fs";
import { DB_NAMES, getDb } from "../../database/index.js";
import { closeClanConnections, clanDirPath } from "../../database/core/database.js";
import { closePluginSocketsByClanId } from "../../plugin-api/session/account-cap.js";

export interface PurgeClanResult {
    clanId: string;
    appRowsDeleted: number;
    dirRemoved: boolean;
    socketsClosed: number;
}

export function purgeClanData(clanId: string): PurgeClanResult {
    const result: PurgeClanResult = {
        clanId,
        appRowsDeleted: 0,
        dirRemoved: false,
        socketsClosed: 0,
    };

    const db = getDb(DB_NAMES.APP);
    db.prepare(`UPDATE clansocket_clans SET status = 'archived', archived_at = ? WHERE id = ?`).run(Date.now(), clanId);

    result.socketsClosed = closePluginSocketsByClanId(clanId);

    const r = db.prepare(`DELETE FROM clansocket_clans WHERE id = ?`).run(clanId);
    result.appRowsDeleted = r.changes;

    closeClanConnections(clanId);
    const dir = clanDirPath(clanId);
    try {
        rmSync(dir, { recursive: true, force: true });
        result.dirRemoved = true;
    } catch {
        result.dirRemoved = false;
    }

    return result;
}
