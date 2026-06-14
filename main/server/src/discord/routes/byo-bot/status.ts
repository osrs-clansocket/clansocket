import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { listVaultEntryKeys } from "../../../clan-vault/index.js";
import type { Actor } from "../../../clan-vault/shared/vault-types.js";
import { getClanOwnerSiteAccountId } from "../../../clansocket/auth/clan-owner-lookup.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { getByoBotIdentityForClan } from "../../../database/discord/byo/get-byo-bot-identity.js";
import { getClanBySlug, getSiteAccountById } from "../../../database/index.js";
import {
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
} from "../../../shared/http/http-status.js";

const ENTRY_KEY_DISCORD_BOT = "discord-bot";

const router: Router = Router();

router.get(
    "/:slug",
    handleAsync(async (req: Request, res: Response) => {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        const slug = (req.params.slug as string).toLowerCase();
        try {
            const clan = getClanBySlug(slug);
            if (!clan) {
                res.status(HTTP_NOT_FOUND).json({ error: "clan_not_found" });
                return;
            }
            if (!isClanManager(sid, clan.id)) {
                res.status(HTTP_FORBIDDEN).json({ error: "not_clan_manager" });
                return;
            }
            const identity = getByoBotIdentityForClan(clan.id);
            if (!identity) {
                res.json({ linked: false });
                return;
            }
            const actor: Actor = { kind: "user", user_id: sid };
            const entries = await listVaultEntryKeys(clan.id, actor);
            const vaultEntry = entries.find((e) => e.entry_key === ENTRY_KEY_DISCORD_BOT) ?? null;
            const linkerSiteAccountId = identity.owner_site_account_id;
            const linkerAccount = linkerSiteAccountId
                ? getSiteAccountById(linkerSiteAccountId)
                : null;
            const clanOwnerSiteAccountId = getClanOwnerSiteAccountId(clan.id);
            res.json({
                linked: true,
                bot_id: identity.bot_id,
                username: identity.bot_name,
                application_id: identity.application_id,
                last_verified_at: vaultEntry?.last_verified_at ?? null,
                last_verified_status: vaultEntry?.last_verified_status ?? null,
                owner_site_account_id: linkerSiteAccountId,
                owner_display_name: linkerAccount?.display_name ?? linkerSiteAccountId,
                clan_owner_site_account_id: clanOwnerSiteAccountId,
            });
        } catch (err) {
            logger.error(`[discord-byo] status failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "status_failed" });
        }
    }),
);

export default router;
