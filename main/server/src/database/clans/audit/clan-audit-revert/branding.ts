import { DB_NAMES, getDb } from "../../../core/database.js";
import { ClanAuditActions } from "../clan-audit-actions.js";
import { recordClanAudit } from "../clan-audit-helpers/record.js";
import type { SourceEntry } from "./types.js";

export function applyBrandingRevert(
    clanId: string,
    row: SourceEntry,
    payload: Record<string, unknown>,
    actor: string,
): void {
    const before = payload.before as { iconKind: string | null; iconValue: string | null; color: string | null } | null;
    const after = payload.after as { iconKind: string | null; iconValue: string | null; color: string | null } | null;
    if (!before) throw new Error("no_before_state");
    const db = getDb(DB_NAMES.APP);
    const current = db.prepare(`SELECT icon_kind, icon_value, color FROM clansocket_clans WHERE id = ?`).get(clanId) as
        | { icon_kind: string | null; icon_value: string | null; color: string | null }
        | undefined;
    db.prepare(`UPDATE clansocket_clans SET icon_kind = ?, icon_value = ?, color = ? WHERE id = ?`).run(
        before.iconKind,
        before.iconValue,
        before.color,
        clanId,
    );
    recordClanAudit(clanId, {
        actor,
        action: ClanAuditActions.BrandingUpdated,
        targetId: clanId,
        payload: {
            before: current
                ? { iconKind: current.icon_kind, iconValue: current.icon_value, color: current.color }
                : after,
            after: before,
            revertsAuditId: row.id,
        },
    });
}
