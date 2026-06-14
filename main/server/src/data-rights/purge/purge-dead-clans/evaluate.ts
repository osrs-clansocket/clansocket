import { getClanPluginDb, listClanPluginModes } from "../../../database/index.js";
import { MS_PER_DAY } from "../../../shared/time.js";
import { CLAN_INACTIVITY_THRESHOLD_MS } from "../../../shared/clan/clan-retention.js";

export const DEAD_CLAN_THRESHOLD_MS = CLAN_INACTIVITY_THRESHOLD_MS;
export const DEAD_CLAN_WARNING_LEAD_MS = 14 * MS_PER_DAY;

export interface ActiveClanRow {
    id: string;
    slug: string;
    display_name: string;
    status: string;
    claimed_at: number | null;
    created_at: number;
}

export function lastPluginActivityMs(clanId: string): number | null {
    let max: number | null = null;
    for (const mode of listClanPluginModes(clanId)) {
        const db = getClanPluginDb(clanId, mode);
        const row = db.prepare(`SELECT MAX(connected_at) AS m FROM plugin_sessions`).get() as
            | { m: number | null }
            | undefined;
        const candidate = row?.m ?? null;
        if (candidate !== null && (max === null || candidate > max)) max = candidate;
    }
    return max;
}

export function evaluateClan(clan: ActiveClanRow, now: number): "purge" | "warn" | "ok" {
    const lastActivity = lastPluginActivityMs(clan.id) ?? clan.claimed_at ?? clan.created_at;
    const silentFor = now - lastActivity;
    if (silentFor >= DEAD_CLAN_THRESHOLD_MS) return "purge";
    if (silentFor >= DEAD_CLAN_THRESHOLD_MS - DEAD_CLAN_WARNING_LEAD_MS) return "warn";
    return "ok";
}
