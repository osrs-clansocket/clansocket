import { getClanPluginDb, listClanPluginModes } from "../../../database/index.js";
import { PLUGIN_ASSET_TABLES, PLUGIN_USER_CHILD_TABLES, PLUGIN_USER_TABLES } from "../../scopes/manifest/index.js";
import { selectAll, stripBlobs } from "./db-helpers.js";
import type { ClanSummary, ModeSummary, ZipEntry } from "./types.js";

export function collectPluginModes(
    clanId: string,
    accountHash: string,
    entries: ZipEntry[],
    clanSummary: ClanSummary,
): void {
    for (const mode of listClanPluginModes(clanId)) {
        const pluginDb = getClanPluginDb(clanId, mode);
        const modeSummary: ModeSummary = { mode, tables: {}, assets: 0 };
        const basePath = `clans/${clanId}/plugin-${mode}.db`;

        for (const { table, column } of PLUGIN_USER_TABLES) {
            const assetCfg = PLUGIN_ASSET_TABLES.find((a) => a.table === table);
            const rows = selectAll(pluginDb, table, `${column} = ?`, accountHash);
            if (rows.length === 0) continue;
            if (assetCfg) {
                for (const row of rows) {
                    const blob = row[assetCfg.blobColumn] as Buffer | null | undefined;
                    if (!blob || !(blob instanceof Buffer)) continue;
                    const id = row[assetCfg.idColumn];
                    const ext = assetCfg.extColumn
                        ? String(row[assetCfg.extColumn] ?? assetCfg.defaultExt).toLowerCase()
                        : assetCfg.defaultExt;
                    const assetPath = `${basePath}/_assets/${table}/${String(id)}.${ext}`;
                    entries.push({ path: assetPath, buffer: blob });
                    modeSummary.assets += 1;
                }
                const stripped = stripBlobs(rows, [assetCfg.blobColumn]);
                entries.push({ path: `${basePath}/${table}.json`, json: stripped });
            } else {
                entries.push({ path: `${basePath}/${table}.json`, json: rows });
            }
            modeSummary.tables[table] = rows.length;
        }

        for (const child of PLUGIN_USER_CHILD_TABLES) {
            const parent = PLUGIN_USER_TABLES.find((t) => t.table === child.parentTable);
            if (!parent) continue;
            const sql =
                `SELECT child.* FROM ${child.table} AS child` +
                ` JOIN ${child.parentTable} AS p ON p.${child.parentColumn} = child.${child.parentKey}` +
                ` WHERE p.${parent.column} = ?`;
            const rows = pluginDb.prepare(sql).all(accountHash) as Record<string, unknown>[];
            if (rows.length === 0) continue;
            entries.push({ path: `${basePath}/${child.table}.json`, json: rows });
            modeSummary.tables[child.table] = rows.length;
        }

        if (Object.keys(modeSummary.tables).length > 0 || modeSummary.assets > 0) {
            clanSummary.modes.push(modeSummary);
        }
    }
}
