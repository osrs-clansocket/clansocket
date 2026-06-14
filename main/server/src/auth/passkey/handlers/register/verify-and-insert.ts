import type { Request } from "express";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { buildBackupCodeFile } from "../../backup-code-file.js";
import { generateBackupCodes } from "../../backup-code-helpers.js";
import { type ChallengeContext } from "../../challenge-helpers.js";
import { insertPasskey, listPasskeysForAccount } from "../../passkey-helpers.js";
import { expectedOrigin, rpId } from "../config.js";

export async function verifyAndInsert(
    req: Request,
    body: { response: RegistrationResponseJSON; deviceName?: string },
    ctx: ChallengeContext,
    siteAccountId: string,
): Promise<boolean> {
    const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: ctx.challenge,
        expectedOrigin: expectedOrigin(req),
        expectedRPID: rpId(req),
    });
    if (!verification.verified || !verification.registrationInfo) return false;
    const cred = verification.registrationInfo.credential;
    insertPasskey({
        siteAccountId,
        credentialId: cred.id,
        publicKey: Buffer.from(cred.publicKey),
        deviceName: (body.deviceName ?? "").trim() || null,
    });
    return true;
}

export function buildBackupBundle(siteAccountId: string, displayName: string): { codes: string[]; file: string } {
    const codes = generateBackupCodes(siteAccountId);
    const devices = listPasskeysForAccount(siteAccountId).map((p) => ({
        deviceName: p.device_name,
        createdAt: p.created_at,
    }));
    const file = buildBackupCodeFile({ siteAccountId, displayName, codes, devices });
    return { codes, file };
}
