import { getClanPluginDb, listClanPluginModes } from "../../../database/index.js";
import { PLUGIN_USER_TABLES } from "../../scopes/manifest/index.js";
import type { PurgeUserResult } from "./types.js";

export function purgePluginModes(clanId: string, accountHash: string, result: PurgeUserResult): boolean {
    let touched = false;
    for (const mode of listClanPluginModes(clanId)) {
        const pluginDb = getClanPluginDb(clanId, mode);
        pluginDb.transaction(() => {
            for (const { table, column } of PLUGIN_USER_TABLES) {
                const r = pluginDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(accountHash);
                if (r.changes > 0) {
                    result.pluginRowDeletes += r.changes;
                    touched = true;
                }
            }
        })();
    }
    return touched;
}
