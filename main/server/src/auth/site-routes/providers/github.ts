import { ERROR_GITHUB_OAUTH_NOT_CONFIGURED } from "../../../shared/error-reasons.js";
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
import { OAUTH_PROVIDER_GITHUB } from "../../oauth-providers.js";
import {
    buildAuthorizeUrl as buildGithubAuthorizeUrl,
    exchangeCodeForToken as exchangeGithubCode,
    fetchUser as fetchGithubUser,
} from "../../oauth/github.js";
import {
    consumeLinkCookie,
    githubConfigured,
    publicBaseUrl,
    requireSiteAccountId,
    setLinkCookie,
    setSessionCookie,
    setStateCookie,
    validateOauthState,
} from "../oauth-helpers.js";

const router: Router = Router();

function startGithub(req: Request, res: Response, linkMode: boolean): void {
    if (!githubConfigured()) {
        res.status(HTTP_SERVICE_UNAVAILABLE).json({ error: ERROR_GITHUB_OAUTH_NOT_CONFIGURED });
        return;
    }
    const state = randomBytes(32).toString("base64url");
    setStateCookie(res, req, state);
    if (linkMode) {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        setLinkCookie(res, req, sid);
    }
    const redirectUri = `${publicBaseUrl(req)}/api/auth/site/github/callback`;
    res.redirect(buildGithubAuthorizeUrl(process.env.GITHUB_CLIENT_ID!, state, redirectUri));
}

router.get("/github/start", (req: Request, res: Response) => startGithub(req, res, false));
router.get("/github/start-link", (req: Request, res: Response) => startGithub(req, res, true));

router.get("/github/callback", async (req: Request, res: Response) => {
    if (!githubConfigured()) {
        res.status(HTTP_SERVICE_UNAVAILABLE).json({ error: ERROR_GITHUB_OAUTH_NOT_CONFIGURED });
        return;
    }
    const validated = validateOauthState(req, res);
    if (!validated.ok) return;
    try {
        const redirectUri = `${publicBaseUrl(req)}/api/auth/site/github/callback`;
        const accessToken = await exchangeGithubCode(
            process.env.GITHUB_CLIENT_ID!,
            process.env.GITHUB_CLIENT_SECRET!,
            validated.code,
            redirectUri,
        );
        const ghUser = await fetchGithubUser(accessToken);
        const args: OAuthLinkArgs = {
            provider: OAUTH_PROVIDER_GITHUB,
            providerUserId: String(ghUser.id),
            displayName: ghUser.name ?? ghUser.login,
            avatarUrl: ghUser.avatar_url,
        };
        const linkSiteAccountId = consumeLinkCookie(req, res);
        if (linkSiteAccountId !== null) {
            try {
                linkOAuthToAccount(linkSiteAccountId, args);
                res.redirect("/account?linked=github");
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
        logger.error(`[site-auth] github callback failed: ${(err as Error).message}`);
        res.status(HTTP_INTERNAL_ERROR).send("oauth_exchange_failed");
    }
});

export default router;
