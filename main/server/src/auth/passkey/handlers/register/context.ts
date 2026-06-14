import { randomUUID } from "node:crypto";
import { upsertSiteAccount } from "../../../../database/site/site-account-helpers/index.js";
import { type ChallengeContext } from "../../challenge-helpers.js";
import { redeemBackupCode } from "../../backup-code-helpers.js";
import { consumeLinkCode } from "../../device-link-helpers.js";

export { challengeOf } from "../../challenge-helpers.js";

const PASSKEY_PROVIDER = "passkey";

export interface RegisterBody {
    mode?: "new" | "link" | "recover";
    displayName?: string;
    linkCode?: string;
    backupCode?: string;
}

function newRegisterCtx(opts: {
    siteAccountId?: string | null;
    displayName?: string | null;
    linkCode?: string | null;
    backupCode?: string | null;
}): ChallengeContext {
    return {
        challenge: "",
        purpose: "register",
        siteAccountId: opts.siteAccountId ?? null,
        displayName: opts.displayName ?? null,
        linkCode: opts.linkCode ?? null,
        backupCode: opts.backupCode ?? null,
    };
}

export function resolveContext(body: RegisterBody): ChallengeContext | { error: string } {
    const mode = body.mode ?? "new";
    if (mode === "new") {
        const name = (body.displayName ?? "").trim();
        if (name.length === 0) return { error: "display_name_required" };
        return newRegisterCtx({ siteAccountId: randomUUID(), displayName: name });
    }
    if (mode === "link") {
        const code = (body.linkCode ?? "").trim();
        if (code.length === 0) return { error: "link_code_required" };
        return newRegisterCtx({ linkCode: code });
    }
    const code = (body.backupCode ?? "").trim();
    if (code.length === 0) return { error: "backup_code_required" };
    return newRegisterCtx({ backupCode: code });
}

export function resolveTarget(
    ctx: ChallengeContext,
): { siteAccountId: string; displayName: string } | { error: string } {
    if (ctx.linkCode !== null) {
        const c = consumeLinkCode(ctx.linkCode);
        return c ? { siteAccountId: c.siteAccountId, displayName: "linked-device" } : { error: "link_code_invalid" };
    }
    if (ctx.backupCode !== null) {
        const c = redeemBackupCode(ctx.backupCode);
        return c
            ? { siteAccountId: c.siteAccountId, displayName: "recovered-device" }
            : { error: "backup_code_invalid" };
    }
    if (!ctx.siteAccountId || !ctx.displayName) return { error: "context_missing" };
    const account = upsertSiteAccount({
        provider: PASSKEY_PROVIDER,
        providerUserId: ctx.siteAccountId,
        displayName: ctx.displayName,
    });
    return { siteAccountId: account.id, displayName: ctx.displayName };
}
