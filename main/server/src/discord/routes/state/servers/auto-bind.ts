import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { authenticate, handleAsync } from "../../../../api/middleware.js";
import { getByoIdentityByBotId } from "../../../../database/discord/byo/get-byo-identity-by-bot-id.js";
import { getServerByGuildId } from "../../../../database/discord/servers/get-server-by-guild-id.js";
import { installServer } from "../../../../database/discord/servers/install.js";
import { getClanById } from "../../../../database/index.js";
import { HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../../shared/http/http-status.js";

const ACTION_SKIPPED_NON_BYO = "skipped_non_byo_or_no_clan";
const ACTION_ALREADY_BOUND = "already_bound_same_bot";
const ACTION_BOUND = "bound";
const ACTION_CLAIMED = "routing_claimed_from_other_bot";
const DEFAULT_OAUTH_SCOPES = '["bot","applications.commands"]';
const DEFAULT_PERMISSIONS = 0;

interface AutoBindBody {
    bot_id: string;
    guild_id: string;
    guild_name: string;
}

const router: Router = Router();

router.post(
    "/servers/auto-bind",
    authenticate,
    handleAsync(async (req: Request, res: Response) => {
        const body = req.body as AutoBindBody;
        try {
            const identity = getByoIdentityByBotId(body.bot_id);
            if (!identity || !identity.clan_id) {
                res.status(HTTP_OK).json({ ok: true, action: ACTION_SKIPPED_NON_BYO });
                return;
            }
            const existing = getServerByGuildId(body.guild_id);
            if (existing && existing.bot_id === body.bot_id) {
                res.status(HTTP_OK).json({ ok: true, action: ACTION_ALREADY_BOUND });
                return;
            }
            const clan = getClanById(identity.clan_id);
            if (!clan) {
                res.status(HTTP_OK).json({ ok: true, action: ACTION_SKIPPED_NON_BYO });
                return;
            }
            installServer({
                guildId: body.guild_id,
                guildName: body.guild_name,
                clanId: identity.clan_id,
                clanName: clan.display_name,
                botId: body.bot_id,
                botName: identity.bot_name,
                installerSiteAccountId: identity.owner_site_account_id ?? "",
                installerSiteAccountName: null,
                oauthScopesJson: DEFAULT_OAUTH_SCOPES,
                permissionsBitfield: DEFAULT_PERMISSIONS,
            });
            const action = existing ? ACTION_CLAIMED : ACTION_BOUND;
            logger.info(`[discord] auto-bind ${action}: bot=${body.bot_id} guild=${body.guild_id}`);
            res.status(HTTP_OK).json({ ok: true, action });
        } catch (err) {
            logger.error(
                `[discord] auto-bind failed bot=${body.bot_id} guild=${body.guild_id}: ${(err as Error).message}`,
            );
            res.status(HTTP_INTERNAL_ERROR).json({ error: "auto_bind_failed" });
        }
    }),
);

export default router;
