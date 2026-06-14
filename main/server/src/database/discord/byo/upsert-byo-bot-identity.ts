import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const OWNER_KIND_BYO = "byo";

interface UpsertByoBotIdentityParams {
    botId: string;
    clanId: string;
    clanName: string;
    username: string;
    applicationId: string;
    intentsBitfield: number;
    ownerSiteAccountId: string;
    publicKey?: string | null;
}

const SQL = `INSERT INTO discord_bot_identities (
    bot_id, bot_name, application_id, application_name, owner_kind, owner_site_account_id,
    clan_id, clan_name, public_key, intents_bitfield, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(bot_id) DO UPDATE SET
    bot_name = excluded.bot_name,
    application_id = excluded.application_id,
    application_name = excluded.application_name,
    clan_id = excluded.clan_id,
    clan_name = excluded.clan_name,
    public_key = excluded.public_key,
    intents_bitfield = excluded.intents_bitfield,
    token_invalidated_at = NULL,
    updated_at = excluded.updated_at`;

export function upsertByoBotIdentity(params: UpsertByoBotIdentityParams): void {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const now = Date.now();
    db.prepare(SQL).run(
        params.botId,
        params.username,
        params.applicationId,
        params.username,
        OWNER_KIND_BYO,
        params.ownerSiteAccountId,
        params.clanId,
        params.clanName,
        params.publicKey ?? null,
        params.intentsBitfield,
        now,
        now,
    );
}
