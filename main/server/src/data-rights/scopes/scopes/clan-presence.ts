import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DB_NAMES, getClanDb, getClanPluginDb, getDb, listClanPluginModes } from "../../../database/index.js";
import { clanDirPath, getClanAuditDb } from "../../../database/core/database.js";
import type { ClanPresence, ClanRow } from "./types.js";

export function userHasPluginRows(clanId: string, mode: string, hashes: readonly string[]): boolean {
    if (hashes.length === 0) return false;
    const placeholder = hashes.map(() => "?").join(",");
    const row = getClanPluginDb(clanId, mode)
        .prepare(`SELECT 1 FROM plugin_sessions WHERE account_hash IN (${placeholder}) LIMIT 1`)
        .get(...hashes);
    return Boolean(row);
}

export function userTouchesClanDb(clanId: string, siteAccountId: string, hashes: readonly string[]): boolean {
    const db = getClanDb(clanId);
    if (hashes.length > 0) {
        const ph = hashes.map(() => "?").join(",");
        const r = db
            .prepare(`SELECT 1 FROM clan_rosters WHERE captured_by_account_hash IN (${ph}) LIMIT 1`)
            .get(...hashes);
        if (r) return true;
    }
    const r2 = db
        .prepare(
            `SELECT 1 FROM clan_invites WHERE created_by_site_account_id = ?
             UNION ALL SELECT 1 FROM clan_invite_redemptions WHERE redeemed_by_site_account_id = ? LIMIT 1`,
        )
        .get(siteAccountId, siteAccountId);
    return Boolean(r2);
}

export function userTouchesAuditDb(clanId: string, siteAccountId: string): boolean {
    const r = getClanAuditDb(clanId)
        .prepare(`SELECT 1 FROM clan_audit_log WHERE actor_site_account_id = ? LIMIT 1`)
        .get(siteAccountId);
    return Boolean(r);
}

export function clansWithUserPresence(siteAccountId: string, hashes: readonly string[]): ClanPresence[] {
    const clans = getDb(DB_NAMES.APP)
        .prepare(`SELECT id, slug, display_name FROM clansocket_clans WHERE archived_at IS NULL`)
        .all() as ClanRow[];
    const out: ClanPresence[] = [];
    for (const clan of clans) {
        const dir = clanDirPath(clan.id);
        const hasClan = existsSync(resolve(dir, "clan.db")) && userTouchesClanDb(clan.id, siteAccountId, hashes);
        const hasAudit = existsSync(resolve(dir, "clan_audit.db")) && userTouchesAuditDb(clan.id, siteAccountId);
        const presentModes = listClanPluginModes(clan.id).filter((m) => userHasPluginRows(clan.id, m, hashes));
        if (!hasClan && !hasAudit && presentModes.length === 0) continue;
        out.push({ clan, hasClanDb: hasClan, hasAuditDb: hasAudit, presentModes });
    }
    return out;
}
