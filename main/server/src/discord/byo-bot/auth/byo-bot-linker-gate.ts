import { getClanOwnerSiteAccountId } from "../../../clansocket/auth/clan-owner-lookup.js";

export function isLinkerOrClanOwner(siteAccountId: string, clanId: string, existingLinkerId: string): boolean {
    if (siteAccountId === existingLinkerId) return true;
    return siteAccountId === getClanOwnerSiteAccountId(clanId);
}
