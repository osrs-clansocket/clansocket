import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { handleAsync } from "../../../api/middleware.js";
import { requireSiteAccountId } from "../../../auth/site-routes/oauth-helpers.js";
import { recordVerify, writeVaultEntry } from "../../../clan-vault/index.js";
import type { Actor } from "../../../clan-vault/shared/vault-types.js";
import { isClanManager } from "../../../database/clans/access/clan-manager-helpers.js";
import { getByoBotIdentityForClan } from "../../../database/discord/byo/get-byo-bot-identity.js";
import { upsertByoBotIdentity } from "../../../database/discord/byo/upsert-byo-bot-identity.js";
import { updateServerBot } from "../../../database/discord/servers/update-server-bot.js";
import { getClanBySlug } from "../../../database/index.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
} from "../../../shared/http/http-status.js";
import { isLinkerOrClanOwner } from "../../byo-bot/auth/byo-bot-linker-gate.js";
import { validateDiscordBotPayload } from "../../byo-bot/validators/byo-bot-payload-validator.js";
import { verifyDiscordBotCredentials } from "../../byo-bot/verifiers/byo-token-verifier.js";

const ENTRY_KEY_DISCORD_BOT = "discord-bot";
const ENTRY_TYPE_DISCORD_BOT = "discord-bot";
const DEFAULT_INTENTS_BITFIELD = 1;

function readGuildIdFromBody(body: unknown): string | null {
    if (typeof body !== "object" || body === null) return null;
    const value = (body as { guild_id?: unknown }).guild_id;
    if (typeof value !== "string" || value.length === 0) return null;
    return value;
}

const router: Router = Router();

router.post(
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
            const payload = req.body as unknown;
            if (!validateDiscordBotPayload(payload)) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "invalid_payload" });
                return;
            }
            const existing = getByoBotIdentityForClan(clan.id);
            if (existing && !isLinkerOrClanOwner(sid, clan.id, existing.owner_site_account_id ?? "")) {
                res.status(HTTP_FORBIDDEN).json({ error: "not_linker_or_clan_owner" });
                return;
            }
            const verifyResult = await verifyDiscordBotCredentials(payload);
            if (verifyResult.status !== "ok" || !verifyResult.public_metadata) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: verifyResult.status });
                return;
            }
            const actor: Actor = { kind: "user", user_id: sid };
            const writeResult = await writeVaultEntry(
                clan.id,
                ENTRY_KEY_DISCORD_BOT,
                ENTRY_TYPE_DISCORD_BOT,
                payload,
                actor,
                validateDiscordBotPayload,
            );
            if (!writeResult.ok) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: writeResult.reason });
                return;
            }
            const botId = existing?.bot_id ?? randomUUID();
            const linkerSiteAccountId = existing?.owner_site_account_id ?? sid;
            upsertByoBotIdentity({
                botId,
                clanId: clan.id,
                clanName: clan.display_name,
                username: verifyResult.public_metadata.username,
                applicationId: verifyResult.public_metadata.application_id,
                intentsBitfield: DEFAULT_INTENTS_BITFIELD,
                ownerSiteAccountId: linkerSiteAccountId,
                publicKey: payload.public_key,
            });
            await recordVerify(clan.id, ENTRY_KEY_DISCORD_BOT, "ok", actor);
            // Optional per-guild routing bind: if the dashboard sent a guild_id
            // alongside the credentials, flip that guild's discord_servers row
            // to route through the BYO bot. The UPDATE is scoped to (clan_id,
            // guild_id) so passing a guild from a different clan is a silent
            // no-op (0 rows affected).
            let boundGuildId: string | null = null;
            const requestedGuildId = readGuildIdFromBody(req.body);
            if (requestedGuildId !== null) {
                const bound = updateServerBot(clan.id, requestedGuildId, botId, verifyResult.public_metadata.username);
                if (bound) boundGuildId = requestedGuildId;
            }
            res.json({
                ok: true,
                linked: {
                    bot_id: botId,
                    username: verifyResult.public_metadata.username,
                    application_id: verifyResult.public_metadata.application_id,
                },
                bound_guild_id: boundGuildId,
            });
        } catch (err) {
            logger.error(`[discord-byo] link failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "link_failed" });
        }
    }),
);

export default router;
