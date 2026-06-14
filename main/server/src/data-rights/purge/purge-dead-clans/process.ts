import { DB_NAMES, getDb, listClanManagersForAccount, listManagersForClan } from "../../../database/index.js";
import { hasRecentNotificationForClan, insertNotification } from "../../../notifications/helpers.js";
import { MS_PER_DAY } from "../../../shared/time.js";
import { recordAction } from "../../cooldown.js";
import { ACTION_CLAN_AUTO_PURGED } from "../../scopes/action-kinds.js";
import { purgeClanData } from "../purge-clan.js";
import { DEAD_CLAN_THRESHOLD_MS, lastPluginActivityMs, type ActiveClanRow } from "./evaluate.js";

const DEAD_CLAN_THRESHOLD_DAYS = Math.round(DEAD_CLAN_THRESHOLD_MS / MS_PER_DAY);
const WARNING_REISSUE_WINDOW_MS = 7 * MS_PER_DAY;

export function processWarn(clan: ActiveClanRow, now: number): number {
    const managers = listManagersForClan(clan.id);
    const lastActivity = lastPluginActivityMs(clan.id) ?? clan.claimed_at ?? clan.created_at;
    const silentFor = now - lastActivity;
    const daysLeft = Math.max(1, Math.ceil((DEAD_CLAN_THRESHOLD_MS - silentFor) / MS_PER_DAY));
    const silentDays = Math.floor(silentFor / MS_PER_DAY);
    let count = 0;
    for (const m of managers) {
        if (hasRecentNotificationForClan(m.site_account_id, "clan_warning", clan.slug, WARNING_REISSUE_WINDOW_MS)) {
            continue;
        }
        insertNotification({
            siteAccountId: m.site_account_id,
            kind: "clan_warning",
            title: `"${clan.display_name}" auto-removal in ${daysLeft} days`,
            body: `No plugin activity received from anyone in ur clan for ${silentDays} days. Log into RuneLite with the ClanSocket plugin enabled to keep the clan, or it gets auto-deleted in ${daysLeft} days.`,
            href: `/clans/${clan.slug}`,
        });
        count += 1;
    }
    return count;
}

export function processPurge(clan: ActiveClanRow): number {
    const managerIds = listManagersForClan(clan.id).map((m) => m.site_account_id);
    for (const siteAccountId of managerIds) {
        recordAction(siteAccountId, ACTION_CLAN_AUTO_PURGED, clan.id);
    }
    purgeClanData(clan.id);
    for (const siteAccountId of managerIds) {
        insertNotification({
            siteAccountId,
            kind: "clan_purged",
            title: `Clan "${clan.display_name}" auto-removed`,
            body: `No plugin activity for over ${DEAD_CLAN_THRESHOLD_DAYS} days. The clan and all its stored data have been permanently deleted. Anyone can claim the name fresh.`,
            href: null,
        });
    }
    return managerIds.length;
}

export function loadActiveClansForManager(siteAccountId: string): ActiveClanRow[] {
    const managed = listClanManagersForAccount(siteAccountId);
    if (managed.length === 0) return [];
    const ids = managed.map((m) => m.clan_id);
    const placeholders = ids.map(() => "?").join(",");
    const appDb = getDb(DB_NAMES.APP);
    return appDb
        .prepare(
            `SELECT id, slug, display_name, status, claimed_at, created_at
             FROM clansocket_clans
             WHERE id IN (${placeholders}) AND status = 'active' AND archived_at IS NULL`,
        )
        .all(...ids) as ActiveClanRow[];
}
