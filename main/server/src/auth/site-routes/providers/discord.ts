import { ERROR_DISCORD_OAUTH_NOT_CONFIGURED } from "../../../shared/error-reasons.js";
import { HTTP_INTERNAL_ERROR, HTTP_SERVICE_UNAVAILABLE } from "../../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import {
    OAuthLinkConflictError,
    type OAuthLinkArgs,
    linkOAuthToAccount,
    resolveOrCreateOAuthAccount,
} from "../../../database/site/site-account-helpers/index.js";
import { mintSiteSession } from "../../site-session.js";
import { OAUTH_PROVIDER_DISCORD } from "../../oauth-providers.js";
import {
    avatarUrl as discordAvatarUrl,
    buildAuthorizeUrl as buildDiscordAuthorizeUrl,
    exchangeCodeForToken as exchangeDiscordCode,
    fetchUser as fetchDiscordUser,
} from "../../oauth/discord.js";
import {
    consumeLinkCookie,
    discordClientId,
    discordConfigured,
    publicBaseUrl,
    requireSiteAccountId,
    setLinkCookie,
    setSessionCookie,
    setStateCookie,
    validateOauthState,
} from "../oauth-helpers.js";

const router: Router = Router();

function startDiscord(req: Request, res: Response, linkMode: boolean): void {
    if (!discordConfigured()) {
        res.status(HTTP_SERVICE_UNAVAILABLE).json({ error: ERROR_DISCORD_OAUTH_NOT_CONFIGURED });
        return;
    }
    const state = randomBytes(32).toString("base64url");
    setStateCookie(res, req, state);
    if (linkMode) {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        setLinkCookie(res, req, sid);
    }
    const redirectUri = `${publicBaseUrl(req)}/api/auth/site/discord/callback`;
    res.redirect(buildDiscordAuthorizeUrl(discordClientId()!, state, redirectUri));
}

router.get("/discord/start", (req: Request, res: Response) => startDiscord(req, res, false));
router.get("/discord/start-link", (req: Request, res: Response) => startDiscord(req, res, true));

router.get("/discord/callback", async (req: Request, res: Response) => {
    if (!discordConfigured()) {
        res.status(HTTP_SERVICE_UNAVAILABLE).json({ error: ERROR_DISCORD_OAUTH_NOT_CONFIGURED });
        return;
    }
    const validated = validateOauthState(req, res);
    if (!validated.ok) return;
    try {
        const redirectUri = `${publicBaseUrl(req)}/api/auth/site/discord/callback`;
        const accessToken = await exchangeDiscordCode(
            discordClientId()!,
            process.env.DISCORD_CLIENT_SECRET!,
            validated.code,
            redirectUri,
        );
        const dUser = await fetchDiscordUser(accessToken);
        const args: OAuthLinkArgs = {
            provider: OAUTH_PROVIDER_DISCORD,
            providerUserId: dUser.id,
            displayName: dUser.global_name ?? dUser.username,
            avatarUrl: discordAvatarUrl(dUser),
        };
        const linkSiteAccountId = consumeLinkCookie(req, res);
        if (linkSiteAccountId !== null) {
            try {
                linkOAuthToAccount(linkSiteAccountId, args);
                res.redirect("/account?linked=discord");
            } catch (err) {
                if (err instanceof OAuthLinkConflictError) {
                    res.redirect(`/account?link_error=${err.conflict}`);
                } else {
                    throw err;
                }
            }
            return;
        }
        const account = resolveOrCreateOAuthAccount(args);
        const session = mintSiteSession(account.id);
        setSessionCookie(res, req, session.id);
        res.redirect("/");
    } catch (err) {
        logger.error(`[site-auth] discord callback failed: ${(err as Error).message}`);
        res.status(HTTP_INTERNAL_ERROR).send("oauth_exchange_failed");
    }
});

export default router;
