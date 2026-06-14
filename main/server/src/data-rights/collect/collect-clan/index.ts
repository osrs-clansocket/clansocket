import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { clanDirPath } from "../../../database/core/database.js";
import { DB_NAMES, getDb } from "../../../database/index.js";
import type { ZipEntry } from "../collect-user/index.js";
import { collectClanAuditDb, collectClanDb, collectPluginModes } from "./dbs.js";
import { collectClanIcons } from "./icons.js";
import { APP_TABLES_BY_CLAN_ID, type ClanCollectionSummary } from "./types.js";

export type { ClanCollectionSummary } from "./types.js";

export function collectClanData(clanId: string): { entries: ZipEntry[]; summary: ClanCollectionSummary } | null {
    const appDb = getDb(DB_NAMES.APP);
    const clan = appDb
        .prepare(
            `SELECT id, slug, display_name, status, icon_kind, icon_value
             FROM clansocket_clans WHERE id = ?`,
        )
        .get(clanId) as
        | {
              id: string;
              slug: string;
              display_name: string;
              status: string;
              icon_kind: string | null;
              icon_value: string | null;
          }
        | undefined;
    if (!clan) return null;

    const entries: ZipEntry[] = [];
    const summary: ClanCollectionSummary = {
        clanId: clan.id,
        displayName: clan.display_name,
        slug: clan.slug,
        status: clan.status,
        exportedAt: Date.now(),
        appTables: {},
        clanDbTables: {},
        clanAuditDbTables: {},
        modes: [],
        icon: null,
    };

    for (const { table, column } of APP_TABLES_BY_CLAN_ID) {
        const rows = appDb.prepare(`SELECT * FROM ${table} WHERE ${column} = ?`).all(clanId) as Record<
            string,
            unknown
        >[];
        if (rows.length === 0) continue;
        entries.push({ path: `clansocket.db/${table}.json`, json: rows });
        summary.appTables[table] = rows.length;
    }

    const clanDir = clanDirPath(clanId);

    if (clan.icon_kind === "image") {
        collectClanIcons(clanId, clanDir, entries, summary);
    }

    if (existsSync(resolve(clanDir, "clan.db"))) {
        collectClanDb(clanId, entries, summary);
    }

    if (existsSync(resolve(clanDir, "clan_audit.db"))) {
        collectClanAuditDb(clanId, entries, summary);
    }

    collectPluginModes(clanId, entries, summary);

    entries.unshift({ path: "manifest.json", json: summary });

    return { entries, summary };
}
