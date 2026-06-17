import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import https from "node:https";
import { handleAsync, validateGuildId } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { resolveServerByGuildId } from "../../../database/discord/resolve-server.js";
import { upsertWebhookToken } from "../../../database/discord/webhook-tokens/upsert.js";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_INTERNAL_ERROR, HTTP_OK } from "../../../shared/http/http-status.js";
import { parseWebhookUrl } from "../../../shared/parsers/webhook-url-parser.js";

const HTTP_STATUS_OK = 200;

interface BindBody {
    webhook_url: string;
}

interface DiscordWebhookMetadata {
    id: string;
    token: string;
    guild_id: string | null;
    channel_id: string;
    name: string | null;
}

function fetchWebhookMetadata(webhookId: string, webhookToken: string): Promise<DiscordWebhookMetadata | null> {
    return new Promise((resolve, reject) => {
        const url = `https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}`;
        const req = https.get(url, (res) => {
            let body = "";
            res.on("data", (chunk: string) => {
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode !== HTTP_STATUS_OK) {
                    resolve(null);
                    return;
                }
                try {
                    resolve(JSON.parse(body) as DiscordWebhookMetadata);
                } catch (err) {
                    reject(err);
                }
            });
        });
        req.on("error", reject);
    });
}

const router: Router = Router();

router.post(
    "/:guildId/bind",
    validateGuildId,
    handleAsync(async (req: Request, res: Response) => {
        const sid = requireSiteAccountId(req, res);
        if (!sid) return;
        const guildId = req.params.guildId as string;
        const body = req.body as BindBody;
        if (typeof body?.webhook_url !== "string") {
            res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "missing_url" });
            return;
        }
        try {
            const server = resolveServerByGuildId(guildId);
            if (!server) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "guild_not_bound" });
                return;
            }
            if (!isClanManager(sid, server.clan_id)) {
                res.status(HTTP_FORBIDDEN).json({ ok: false, reason: "not_clan_manager" });
                return;
            }
            const parsed = parseWebhookUrl(body.webhook_url);
            if (!parsed) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "invalid_url_format" });
                return;
            }
            const metadata = await fetchWebhookMetadata(parsed.webhookId, parsed.webhookToken);
            if (!metadata) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "webhook_unreachable" });
                return;
            }
            if (metadata.guild_id !== guildId) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "webhook_belongs_to_other_guild" });
                return;
            }
            upsertWebhookToken({
                clanId: server.clan_id,
                guildId,
                webhookId: parsed.webhookId,
                channelId: metadata.channel_id,
                channelName: null,
                plaintextToken: parsed.webhookToken,
                acquiredByBotId: null,
                boundBySiteAccountId: sid,
                boundBySiteAccountName: null,
            });
            res.status(HTTP_OK).json({
                ok: true,
                bound: {
                    webhook_id: parsed.webhookId,
                    guild_id: guildId,
                    channel_id: metadata.channel_id,
                },
            });
        } catch (err) {
            logger.error(`[discord] webhook-token bind failed guildId=${guildId}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "webhook_token_bind_failed" });
        }
    }),
);

export default router;
