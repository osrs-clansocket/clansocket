import { getDb, DB_NAMES, ensureClanDirAbsolute } from "../../core/database.js";
import { resolveOrCreateClan, type ClanRow } from "../clan-app-helpers.js";
import { insertClanManager } from "./clan-manager-helpers.js";
import { bindSiteAccountAccountHash } from "../../site/site-account-helpers/index.js";
import { recordClanAudit } from "../audit/clan-audit-helpers/record.js";
import { ClanAuditActions } from "../audit/clan-audit-actions.js";

export class ClanClaimError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
    }
}

export interface FinalizeClaimArgs {
    displayName: string;
    slug: string;
    siteAccountId: string;
    accountHash: string;
    rsn: string;
}

export function finalizeClanClaim(args: FinalizeClaimArgs): ClanRow {
    const db = getDb(DB_NAMES.APP);
    const now = Date.now();
    const clan = resolveOrCreateClan(args.displayName);

    if (clan.status === "active" && clan.owner_account_hash && clan.owner_account_hash !== args.accountHash) {
        throw new ClanClaimError("already_claimed", `Clan "${args.displayName}" is already claimed.`);
    }

    const slugCollision = db
        .prepare(`SELECT id FROM clansocket_clans WHERE slug = ? AND id != ?`)
        .get(args.slug, clan.id) as { id: string } | undefined;
    if (slugCollision) {
        throw new ClanClaimError("slug_collision", `Slug "${args.slug}" is taken by another clan.`);
    }

    const tx = db.transaction(() => {
        db.prepare(
            `UPDATE clansocket_clans
             SET slug = ?, status = 'active', owner_account_hash = ?, owner_rsn = ?, owner_site_account_id = ?, claimed_at = ?
             WHERE id = ?`,
        ).run(args.slug, args.accountHash, args.rsn, args.siteAccountId, now, clan.id);

        bindSiteAccountAccountHash(args.siteAccountId, args.accountHash);
    });
    tx();

    insertClanManager(args.siteAccountId, clan.id, "owner", "owner_self", args.siteAccountId);

    ensureClanDirAbsolute(clan.id);

    recordClanAudit(clan.id, {
        actor: args.siteAccountId,
        action: ClanAuditActions.ClaimCompleted,
        targetId: clan.id,
        payload: { displayName: args.displayName, slug: args.slug },
    });

    return {
        ...clan,
        slug: args.slug,
        status: "active",
        owner_account_hash: args.accountHash,
        owner_site_account_id: args.siteAccountId,
        claimed_at: now,
    };
}
