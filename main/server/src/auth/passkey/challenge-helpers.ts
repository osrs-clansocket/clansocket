import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { DB_NAMES, getDb } from "../../database/index.js";
import { MS_PER_MINUTE } from "../../shared/time.js";

type WithClientData = AuthenticationResponseJSON | RegistrationResponseJSON;

export function challengeOf(response: WithClientData): string {
    const clientDataJSON = Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8");
    return (JSON.parse(clientDataJSON) as { challenge: string }).challenge;
}

const CHALLENGE_TTL_MS = MS_PER_MINUTE;

export type ChallengePurpose = "register" | "authenticate";

export interface ChallengeContext {
    challenge: string;
    purpose: ChallengePurpose;
    siteAccountId: string | null;
    displayName: string | null;
    linkCode: string | null;
    backupCode: string | null;
}

function sweepExpired(now: number): void {
    const db = getDb(DB_NAMES.APP);
    db.prepare(`DELETE FROM clansocket_webauthn_challenges WHERE expires_at <= ?`).run(now);
}

export function storeChallenge(ctx: ChallengeContext): void {
    const now = Date.now();
    sweepExpired(now);
    const db = getDb(DB_NAMES.APP);
    db.prepare(
        `INSERT INTO clansocket_webauthn_challenges
            (challenge, purpose, site_account_id, display_name, link_code, backup_code, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
        ctx.challenge,
        ctx.purpose,
        ctx.siteAccountId,
        ctx.displayName,
        ctx.linkCode,
        ctx.backupCode,
        now + CHALLENGE_TTL_MS,
        now,
    );
}

export function startChallenge(
    challenge: string,
    purpose: ChallengePurpose,
    siteAccountId: string | null = null,
): void {
    storeChallenge({ challenge, purpose, siteAccountId, displayName: null, linkCode: null, backupCode: null });
}

export function consumeChallenge(challenge: string, expectedPurpose: ChallengePurpose): ChallengeContext | null {
    const now = Date.now();
    sweepExpired(now);
    const db = getDb(DB_NAMES.APP);
    return db.transaction((): ChallengeContext | null => {
        const row = db
            .prepare(
                `SELECT challenge, purpose, site_account_id, display_name, link_code, backup_code, expires_at
                 FROM clansocket_webauthn_challenges WHERE challenge = ?`,
            )
            .get(challenge) as
            | {
                  challenge: string;
                  purpose: string;
                  site_account_id: string | null;
                  display_name: string | null;
                  link_code: string | null;
                  backup_code: string | null;
                  expires_at: number;
              }
            | undefined;
        if (!row) return null;
        if (row.purpose !== expectedPurpose) return null;
        if (row.expires_at <= now) return null;
        db.prepare(`DELETE FROM clansocket_webauthn_challenges WHERE challenge = ?`).run(challenge);
        return {
            challenge: row.challenge,
            purpose: row.purpose as ChallengePurpose,
            siteAccountId: row.site_account_id,
            displayName: row.display_name,
            linkCode: row.link_code,
            backupCode: row.backup_code,
        };
    })();
}
