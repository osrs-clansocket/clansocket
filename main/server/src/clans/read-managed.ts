import { DB_NAMES, getDb } from "../database/index.js";
import { listClanManagersForAccount } from "../database/clans/access/clan-manager-helpers.js";
import { buildClanView, type ClanRow, type ManagedClanView } from "./clan-view-builder.js";

const MANAGER_ROLE_FALLBACK = "manager";
const GRANTED_VIA_FALLBACK = "unknown";

export type { ManagedClanView, ManagedRoster, ManagedRosterMember } from "./clan-view-builder.js";

export function listManagedClans(siteAccountId: string): ManagedClanView[] {
    const managers = listClanManagersForAccount(siteAccountId);
    if (managers.length === 0) return [];
    const db = getDb(DB_NAMES.APP);
    const placeholders = managers.map(() => "?").join(", ");
    const rows = db
        .prepare(
            `SELECT id, slug, display_name, status, icon_kind, icon_value, color, created_at
             FROM clansocket_clans
             WHERE id IN (${placeholders}) AND archived_at IS NULL`,
        )
        .all(...managers.map((m) => m.clan_id)) as ClanRow[];
    const rolesById = new Map(managers.map((m) => [m.clan_id, m]));
    const out = rows.map((r) => {
        const role = rolesById.get(r.id);
        return buildClanView(
            r,
            role?.role ?? MANAGER_ROLE_FALLBACK,
            role?.granted_via ?? GRANTED_VIA_FALLBACK,
            role?.granted_at ?? 0,
        );
    });
    out.sort((a, b) => a.grantedAt - b.grantedAt);
    return out;
}
