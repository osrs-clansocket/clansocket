import { HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../../site-middleware.js";
import { LINK_CODE_DIGITS, mintLinkCode } from "../../device-link-helpers.js";
import { buildBackupCodeFile } from "../../backup-code-file.js";
import { generateBackupCodes, getBackupCodeMeta } from "../../backup-code-helpers.js";
import { listPasskeysForAccount, revokePasskey } from "../../passkey-helpers.js";
import { requireRecentAuth } from "../step-up.js";
import { OK_FLAG, audit, loadAccountOr404 } from "./helpers.js";

const router: Router = Router();

router.post("/device-link/create", requireSiteAccount, requireRecentAuth, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    try {
        const code = mintLinkCode(siteAccountId);
        audit(
            siteAccountId,
            "Link code generated",
            `A ${LINK_CODE_DIGITS}-digit device-link code was minted on ur account.`,
        );
        res.json({ ok: OK_FLAG, code });
    } catch (err) {
        res.status(HTTP_INTERNAL_ERROR).json({ error: "link_code_mint_failed", message: (err as Error).message });
    }
});

router.post("/backup-codes/generate", requireSiteAccount, requireRecentAuth, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const account = loadAccountOr404(siteAccountId, res);
    if (account === null) return;
    const codes = generateBackupCodes(siteAccountId);
    const fileContent = buildBackupCodeFile({
        siteAccountId,
        displayName: account.display_name ?? "(no display name)",
        codes,
        devices: listPasskeysForAccount(siteAccountId).map((p) => ({
            deviceName: p.device_name,
            createdAt: p.created_at,
        })),
    });
    audit(siteAccountId, "Backup codes regenerated", "A fresh set of 10 backup codes was generated.");
    res.json({ ok: OK_FLAG, codes, fileContent });
});

router.get("/backup-codes/meta", requireSiteAccount, (req: Request, res: Response) => {
    const meta = getBackupCodeMeta(req.siteAccountId!);
    res.json({ meta });
});

router.get("/devices", requireSiteAccount, (req: Request, res: Response) => {
    const rows = listPasskeysForAccount(req.siteAccountId!);
    res.json({
        devices: rows.map((p) => ({
            id: p.id,
            deviceName: p.device_name,
            createdAt: p.created_at,
            lastUsedAt: p.last_used_at,
        })),
    });
});

router.delete("/devices/:id", requireSiteAccount, requireRecentAuth, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    if (!revokePasskey(String(req.params.id ?? ""), siteAccountId)) {
        res.status(HTTP_NOT_FOUND).json({ error: "device_not_found" });
        return;
    }
    audit(siteAccountId, "Device revoked", "A passkey was revoked from ur account.");
    res.json({ ok: OK_FLAG });
});

export default router;
