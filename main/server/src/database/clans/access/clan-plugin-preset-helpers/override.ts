import { getClanDb } from "../../../core/database.js";
import type { PluginPresetSchema } from "../../../../plugin-api/types/client-config.js";

const SCHEMA_VERSION = 1;

interface OverrideRow {
    account_hash: string;
    schema_version: number;
    values_json: string;
    updated_at: number;
    updated_by_site_account_id: string;
}

export interface OverrideRecord {
    accountHash: string;
    preset: PluginPresetSchema;
    updatedAt: number;
    updatedBySiteAccountId: string;
}

function rowToRecord(row: OverrideRow): OverrideRecord {
    return {
        accountHash: row.account_hash,
        preset: {
            version: row.schema_version,
            values: JSON.parse(row.values_json) as Record<string, string | number | boolean>,
        },
        updatedAt: row.updated_at,
        updatedBySiteAccountId: row.updated_by_site_account_id,
    };
}

export function getOverride(clanId: string, accountHash: string): OverrideRecord | null {
    const row = getClanDb(clanId)
        .prepare(
            `SELECT account_hash, schema_version, values_json, updated_at, updated_by_site_account_id
                  FROM clan_plugin_preset_override WHERE account_hash = ?`,
        )
        .get(accountHash) as OverrideRow | undefined;
    return row ? rowToRecord(row) : null;
}

export function listOverrides(clanId: string): OverrideRecord[] {
    const rows = getClanDb(clanId)
        .prepare(
            `SELECT account_hash, schema_version, values_json, updated_at, updated_by_site_account_id
                  FROM clan_plugin_preset_override
                  ORDER BY updated_at DESC`,
        )
        .all() as OverrideRow[];
    return rows.map(rowToRecord);
}

export function setOverride(
    clanId: string,
    accountHash: string,
    values: Record<string, string | number | boolean>,
    siteAccountId: string,
    nowMs: number,
): void {
    const valuesJson = JSON.stringify(values);
    getClanDb(clanId)
        .prepare(
            `INSERT INTO clan_plugin_preset_override (account_hash, schema_version, values_json, updated_at, updated_by_site_account_id)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(account_hash) DO UPDATE SET
                schema_version = excluded.schema_version,
                values_json = excluded.values_json,
                updated_at = excluded.updated_at,
                updated_by_site_account_id = excluded.updated_by_site_account_id`,
        )
        .run(accountHash, SCHEMA_VERSION, valuesJson, nowMs, siteAccountId);
}

export function deleteOverride(clanId: string, accountHash: string): void {
    getClanDb(clanId).prepare(`DELETE FROM clan_plugin_preset_override WHERE account_hash = ?`).run(accountHash);
}
