import type Database from "better-sqlite3";
import { getClanAuditDb } from "../../../database/core/database.js";
import { getClanDb, getClanPluginDb, listClanPluginModes } from "../../../database/index.js";
import { PLUGIN_ASSET_TABLES } from "../../scopes/manifest/index.js";
import type { ZipEntry } from "../collect-user/index.js";
import { listAllTablesInDb, stripBlobs } from "./helpers.js";
import type { ClanCollectionSummary, ModeSummary } from "./types.js";

export function collectClanDb(clanId: string, entries: ZipEntry[], summary: ClanCollectionSummary): void {
    const clanDb = getClanDb(clanId);
    for (const table of listAllTablesInDb(clanDb)) {
        const rows = clanDb.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
        if (rows.length === 0) continue;
        entries.push({ path: `clans/${clanId}/clan.db/${table}.json`, json: rows });
        summary.clanDbTables[table] = rows.length;
    }
}

export function collectClanAuditDb(clanId: string, entries: ZipEntry[], summary: ClanCollectionSummary): void {
    const auditDb = getClanAuditDb(clanId);
    for (const table of listAllTablesInDb(auditDb)) {
        const rows = auditDb.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
        if (rows.length === 0) continue;
        entries.push({ path: `clans/${clanId}/clan_audit.db/${table}.json`, json: rows });
        summary.clanAuditDbTables[table] = rows.length;
    }
}

function collectPluginMode(
    clanId: string,
    mode: string,
    pluginDb: Database.Database,
    entries: ZipEntry[],
): ModeSummary {
    const modeSummary: ModeSummary = { mode, tables: {}, assets: 0 };
    const basePath = `clans/${clanId}/plugin-${mode}.db`;
    for (const table of listAllTablesInDb(pluginDb)) {
        const assetCfg = PLUGIN_ASSET_TABLES.find((a) => a.table === table);
        const rows = pluginDb.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
        if (rows.length === 0) continue;
        if (assetCfg) {
            for (const row of rows) {
                const blob = row[assetCfg.blobColumn] as Buffer | null | undefined;
                if (!blob || !(blob instanceof Buffer)) continue;
                const id = row[assetCfg.idColumn];
                const ext = assetCfg.extColumn
                    ? String(row[assetCfg.extColumn] ?? assetCfg.defaultExt).toLowerCase()
                    : assetCfg.defaultExt;
                entries.push({
                    path: `${basePath}/_assets/${table}/${String(id)}.${ext}`,
                    buffer: blob,
                });
                modeSummary.assets += 1;
            }
            const stripped = stripBlobs(rows, [assetCfg.blobColumn]);
            entries.push({ path: `${basePath}/${table}.json`, json: stripped });
        } else {
            entries.push({ path: `${basePath}/${table}.json`, json: rows });
        }
        modeSummary.tables[table] = rows.length;
    }
    return modeSummary;
}

export function collectPluginModes(clanId: string, entries: ZipEntry[], summary: ClanCollectionSummary): void {
    for (const mode of listClanPluginModes(clanId)) {
        const pluginDb = getClanPluginDb(clanId, mode);
        const modeSummary = collectPluginMode(clanId, mode, pluginDb, entries);
        if (Object.keys(modeSummary.tables).length > 0 || modeSummary.assets > 0) {
            summary.modes.push(modeSummary);
        }
    }
}
