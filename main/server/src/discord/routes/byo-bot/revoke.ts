import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { deleteVaultEntry } from "../../../clan-vault/index.js";
import type { Actor } from "../../../clan-vault/shared/vault-types.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { getByoBotIdentityForClan } from "../../../database/discord/byo/get-byo-bot-identity.js";
import { listGuildsRoutedToBot } from "../../../database/discord/servers/list-guilds-routed-to-bot.js";
import { updateServerBot } from "../../../database/discord/servers/update-server-bot.js";
import { getClanBySlug } from "../../../database/index.js";
import { HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import { isLinkerOrClanOwner } from "../../byo-bot/auth/byo-bot-linker-gate.js";

const ENTRY_KEY_DISCORD_BOT = "discord-bot";
const DEFAULT_BOT_ID = "clansocket-default";

const router: Router = Router();

router.delete(
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
            const existing = getByoBotIdentityForClan(clan.id);
            if (!existing) {
                res.status(HTTP_NOT_FOUND).json({ error: "no_byo_bot_linked" });
                return;
            }
            if (!isLinkerOrClanOwner(sid, clan.id, existing.owner_site_account_id ?? "")) {
                res.status(HTTP_FORBIDDEN).json({ error: "not_linker_or_clan_owner" });
                return;
            }
            const actor: Actor = { kind: "user", user_id: sid };
            // Reset routing for any guild whose discord_servers row currently
            // points at the BYO bot. Without this, revoking the credentials
            // leaves dead routing — events arrive at a bot identity that no
            // longer has a vault entry and the runtime can't authenticate it.
            const reroutedGuildIds = listGuildsRoutedToBot(clan.id, existing.bot_id);
            for (const guildId of reroutedGuildIds) {
                updateServerBot(clan.id, guildId, DEFAULT_BOT_ID, null);
            }
            await deleteVaultEntry(clan.id, ENTRY_KEY_DISCORD_BOT, actor);
            res.json({ ok: true, unbound_guild_ids: reroutedGuildIds });
        } catch (err) {
            logger.error(`[discord-byo] revoke failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "revoke_failed" });
        }
    }),
);

export default router;
