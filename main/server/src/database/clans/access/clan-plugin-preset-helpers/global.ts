import { getClanDb } from "../../../core/database.js";
import type { PluginPresetSchema } from "../../../../plugin-api/types/client-config.js";

const SCHEMA_VERSION = 1;
const SINGLETON_KEY = 1;

interface GlobalRow {
    schema_version: number;
    values_json: string;
    updated_at: number;
    updated_by_site_account_id: string;
}

export interface GlobalPresetRecord {
    preset: PluginPresetSchema;
    updatedAt: number;
    updatedBySiteAccountId: string;
}

export function getGlobalPreset(clanId: string): GlobalPresetRecord | null {
    const row = getClanDb(clanId)
        .prepare(
            `SELECT schema_version, values_json, updated_at, updated_by_site_account_id
                  FROM clan_plugin_preset_global WHERE singleton = ?`,
        )
        .get(SINGLETON_KEY) as GlobalRow | undefined;
    if (!row) return null;
    return {
        preset: {
            version: row.schema_version,
            values: JSON.parse(row.values_json) as Record<string, string | number | boolean>,
        },
        updatedAt: row.updated_at,
        updatedBySiteAccountId: row.updated_by_site_account_id,
    };
}

export function setGlobalPreset(
    clanId: string,
    values: Record<string, string | number | boolean>,
    siteAccountId: string,
    nowMs: number,
): void {
    const valuesJson = JSON.stringify(values);
    getClanDb(clanId)
        .prepare(
            `INSERT INTO clan_plugin_preset_global (singleton, schema_version, values_json, updated_at, updated_by_site_account_id)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(singleton) DO UPDATE SET
                schema_version = excluded.schema_version,
                values_json = excluded.values_json,
                updated_at = excluded.updated_at,
                updated_by_site_account_id = excluded.updated_by_site_account_id`,
        )
        .run(SINGLETON_KEY, SCHEMA_VERSION, valuesJson, nowMs, siteAccountId);
}

export function deleteGlobalPreset(clanId: string): void {
    getClanDb(clanId).prepare(`DELETE FROM clan_plugin_preset_global`).run();
}
