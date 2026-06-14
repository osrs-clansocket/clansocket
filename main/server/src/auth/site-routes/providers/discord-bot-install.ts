import { ERROR_DISCORD_OAUTH_NOT_CONFIGURED } from "../../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_SERVICE_UNAVAILABLE } from "../../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import { getClanById, getClanBySlug, getSiteAccountById } from "../../../database/index.js";
import { installServer } from "../../../database/discord/servers/install.js";
import { buildBotInstallUrl, exchangeBotInstallCode } from "../../oauth/discord-bot-install.js";
import {
    discordClientId,
    discordConfigured,
    isHttps,
    publicBaseUrl,
    readCookie,
    requireSiteAccountId,
    setStateCookie,
    validateOauthState,
} from "../oauth-helpers.js";

const router: Router = Router();
const INSTALL_CLAN_COOKIE = "bot_install_clan_id";
const COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
const DEFAULT_BOT_ID = "clansocket-default";

function setClanCookie(res: Response, req: Request, clanId: string): void {
    res.cookie(INSTALL_CLAN_COOKIE, clanId, {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps(req),
        maxAge: COOKIE_MAX_AGE_MS,
    });
}

function consumeClanCookie(req: Request, res: Response): string | null {
    const clanId = readCookie(req, INSTALL_CLAN_COOKIE);
    if (!clanId) return null;
    res.clearCookie(INSTALL_CLAN_COOKIE);
    return clanId;
}

router.get("/discord-bot-install/start", (req: Request, res: Response) => {
    if (!discordConfigured()) {
        res.status(HTTP_SERVICE_UNAVAILABLE).json({ error: ERROR_DISCORD_OAUTH_NOT_CONFIGURED });
        return;
    }
    const sid = requireSiteAccountId(req, res);
    if (!sid) return;
    const slug = typeof req.query.slug === "string" ? req.query.slug : null;
    if (!slug) {
        res.status(HTTP_BAD_REQUEST).json({ error: "slug_required" });
        return;
    }
    const clan = getClanBySlug(slug);
    if (!clan) {
        res.status(HTTP_BAD_REQUEST).json({ error: "clan_not_found" });
        return;
    }
    const state = randomBytes(32).toString("base64url");
    setStateCookie(res, req, state);
    setClanCookie(res, req, clan.id);
    const redirectUri = `${publicBaseUrl(req)}/api/auth/site/discord-bot-install/callback`;
    res.redirect(buildBotInstallUrl(discordClientId()!, state, redirectUri));
});

router.get("/discord-bot-install/callback", async (req: Request, res: Response) => {
    if (!discordConfigured()) {
        res.status(HTTP_SERVICE_UNAVAILABLE).json({ error: ERROR_DISCORD_OAUTH_NOT_CONFIGURED });
        return;
    }
    const validated = validateOauthState(req, res);
    if (!validated.ok) return;
    const sid = requireSiteAccountId(req, res);
    if (!sid) return;
    const clanId = consumeClanCookie(req, res);
    if (!clanId) {
        res.status(HTTP_BAD_REQUEST).json({ error: "missing_install_clan" });
        return;
    }
    const clan = getClanById(clanId);
    if (!clan) {
        res.status(HTTP_BAD_REQUEST).json({ error: "clan_not_found" });
        return;
    }
    const account = getSiteAccountById(sid);
    try {
        const redirectUri = `${publicBaseUrl(req)}/api/auth/site/discord-bot-install/callback`;
        const result = await exchangeBotInstallCode(
            discordClientId()!,
            process.env.DISCORD_CLIENT_SECRET!,
            validated.code,
            redirectUri,
        );
        installServer({
            guildId: result.guildId,
            guildName: result.guildName,
            clanId,
            clanName: clan.display_name,
            botId: DEFAULT_BOT_ID,
            botName: null,
            installerSiteAccountId: sid,
            installerSiteAccountName: account?.display_name ?? null,
            oauthScopesJson: JSON.stringify(["bot", "applications.commands"]),
            permissionsBitfield: result.permissions,
        });
        res.redirect(`/clans/${clan.slug}/manage/discord?installed=${encodeURIComponent(result.guildId)}`);
    } catch (err) {
        logger.error(`[site-auth] discord bot install callback failed: ${(err as Error).message}`);
        res.status(HTTP_INTERNAL_ERROR).send("bot_install_failed");
    }
});

export default router;
