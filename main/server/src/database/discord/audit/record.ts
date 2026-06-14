import { recordClanAudit } from "../../clans/audit/clan-audit-helpers/record.js";
import type { AnyAuditAction, PayloadFor } from "../../clans/audit/clan-audit-registry/index.js";
import { resolveClanIdForGuild } from "./resolve-clan.js";

export interface DiscordAuditEntry {
    guildId: string;
    discordUserId: string;
    action: string;
    data: Record<string, unknown>;
}

export function recordFromDiscord(entry: DiscordAuditEntry): boolean {
    const clanId = resolveClanIdForGuild(entry.guildId);
    if (!clanId) return false;
    const payload = { ...entry.data, discord_user_id: entry.discordUserId };
    recordClanAudit(clanId, {
        actor: null,
        action: entry.action as AnyAuditAction,
        targetId: null,
        guildId: entry.guildId,
        payload: payload as PayloadFor<AnyAuditAction>,
    });
    return true;
}
