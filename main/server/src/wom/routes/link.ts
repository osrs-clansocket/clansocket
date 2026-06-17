import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { handleAsync } from "../../api/middleware.js";
import { requireSiteAccountId } from "../../auth/site-routes/oauth-helpers.js";
import { recordVerify, writeVaultEntry } from "../../clan-vault/index.js";
import type { Actor } from "../../clan-vault/shared/vault-types.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { upsertClanWomIdentity } from "../../database/wom/identity/upsert-clan-wom-identity.js";
import { getClanBySlug } from "../../database/index.js";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
} from "../../shared/http/http-status.js";
import { isWomLinkerOrClanOwner } from "../auth/wom-linker-gate.js";
import { buildDefaultWomUserAgent } from "../builders/wom-default-ua-builder.js";
import { validateWomPayload } from "../validators/wom-payload-validator.js";
import { verifyWomCredentials } from "../verifiers/wom-credentials-verifier.js";

const ENTRY_KEY_WOM = "wom";
const ENTRY_TYPE_WOM = "wom";

function fillUserAgentDefault(payload: unknown, clanId: string): unknown {
    if (typeof payload !== "object" || payload === null) return payload;
    const p = payload as Record<string, unknown>;
    if (p.user_agent !== undefined) return payload;
    return { ...p, user_agent: buildDefaultWomUserAgent(clanId) };
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
            const payload = fillUserAgentDefault(req.body as unknown, clan.id);
            if (!validateWomPayload(payload)) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: "invalid_payload" });
                return;
            }
            const existing = getClanWomIdentity(clan.id);
            if (existing && !isWomLinkerOrClanOwner(sid, clan.id, existing.linker_site_account_id)) {
                res.status(HTTP_FORBIDDEN).json({ error: "not_linker_or_clan_owner" });
                return;
            }
            const verifyResult = await verifyWomCredentials(payload);
            if (verifyResult.status !== "ok" || !verifyResult.public_metadata) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: verifyResult.status });
                return;
            }
            const actor: Actor = { kind: "user", user_id: sid };
            const writeResult = await writeVaultEntry(
                clan.id,
                ENTRY_KEY_WOM,
                ENTRY_TYPE_WOM,
                payload,
                actor,
                validateWomPayload,
            );
            if (!writeResult.ok) {
                res.status(HTTP_BAD_REQUEST).json({ ok: false, reason: writeResult.reason });
                return;
            }
            const linkerSiteAccountId = existing?.linker_site_account_id ?? sid;
            upsertClanWomIdentity({
                clanId: clan.id,
                linkerSiteAccountId,
                womGroupId: verifyResult.public_metadata.groupId,
                cachedGroupName: verifyResult.public_metadata.groupName,
            });
            await recordVerify(clan.id, ENTRY_KEY_WOM, "ok", actor);
            res.json({
                ok: true,
                linked: {
                    group_id: verifyResult.public_metadata.groupId,
                    group_name: verifyResult.public_metadata.groupName,
                    linker_site_account_id: linkerSiteAccountId,
                },
            });
        } catch (err) {
            logger.error(`[wom] link failed slug=${slug}: ${(err as Error).message}`);
            res.status(HTTP_INTERNAL_ERROR).json({ error: "link_failed" });
        }
    }),
);

export default router;
