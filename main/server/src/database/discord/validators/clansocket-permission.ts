import { isClanManager } from "../../clans/access/clan-manager-helpers.js";
import { listForUser } from "../user-permissions/list.js";

const ADMIN_PERMISSION = "admin";

export interface ClansocketPermissionInput {
    clanId: string;
    guildId: string;
    userId: string;
    requiredKey: string;
}

export function validateClansocketPermission(input: ClansocketPermissionInput): boolean {
    if (isClanManager(input.userId, input.clanId)) return true;
    const granted = listForUser(input.clanId, input.guildId, input.userId);
    return granted.includes(ADMIN_PERMISSION) || granted.includes(input.requiredKey);
}
