import logger from "@clansocket/logger";
import { readVaultEntry } from "../../clan-vault/index.js";
import type { Actor } from "../../clan-vault/shared/vault-types.js";
import { decryptToken } from "../../crypto/aes-gcm-decrypter.js";
import { loadDiscordMasterKeyOrNull } from "../../crypto/master-key-loader.js";
import { validateDiscordBotPayload } from "../../discord/byo-bot/validators/byo-bot-payload-validator.js";
import { DB_NAMES } from "../core/database-state.js";
import { getDb } from "../core/database.js";
import type { BotIdentityDecrypted, BotIdentityRow } from "./types.js";

const OWNER_KIND_CLANSOCKET = "clansocket";
const OWNER_KIND_BYO = "byo";
const VAULT_ENTRY_DISCORD_BOT = "discord-bot";
const DISPATCHER_ACTOR: Actor = { kind: "system", component: "discord-bot-dispatcher" };

async function resolveIdentityToken(r: BotIdentityRow, masterKey: Buffer | null): Promise<string | null> {
    if (r.encrypted_token_b64 && r.token_iv_b64) {
        if (masterKey) return decryptToken(r.encrypted_token_b64, r.token_iv_b64, masterKey);
        logger.warn(`[discord] skipping bot ${r.bot_id}: encrypted token but no DISCORD_TOKEN_ENC_KEY set`);
        return null;
    }
    if (r.owner_kind === OWNER_KIND_CLANSOCKET) {
        const envToken = process.env.DISCORD_TOKEN;
        if (envToken) return envToken;
        logger.warn(`[discord] skipping bot ${r.bot_id}: clansocket-default has NULL token + DISCORD_TOKEN unset`);
        return null;
    }
    if (r.owner_kind === OWNER_KIND_BYO) {
        if (!r.clan_id) {
            logger.warn(`[discord] skipping bot ${r.bot_id}: owner_kind=byo but clan_id NULL`);
            return null;
        }
        const payload = await readVaultEntry(
            r.clan_id,
            VAULT_ENTRY_DISCORD_BOT,
            DISPATCHER_ACTOR,
            validateDiscordBotPayload,
        );
        if (!payload) {
            logger.warn(`[discord] skipping bot ${r.bot_id}: BYO vault entry missing or invalid for clan ${r.clan_id}`);
            return null;
        }
        return payload.bot_token;
    }
    logger.warn(`[discord] skipping bot ${r.bot_id}: no token source`);
    return null;
}

function rowToDecryptedIdentity(r: BotIdentityRow, token: string): BotIdentityDecrypted {
    return {
        bot_id: r.bot_id,
        bot_name: r.bot_name,
        application_id: r.application_id,
        application_name: r.application_name,
        owner_kind: r.owner_kind,
        owner_site_account_id: r.owner_site_account_id,
        clan_id: r.clan_id,
        clan_name: r.clan_name,
        token,
        public_key: r.public_key,
        intents_bitfield: r.intents_bitfield,
        active_presence_template_id: r.active_presence_template_id,
    };
}

export async function listBotIdentitiesWithDecryptedTokens(): Promise<BotIdentityDecrypted[]> {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const masterKey = loadDiscordMasterKeyOrNull();
    const rows = db
        .prepare(
            `SELECT bot_id, bot_name, application_id, application_name, owner_kind, owner_site_account_id, clan_id, clan_name, encrypted_token_b64, token_iv_b64, public_key, intents_bitfield, active_presence_template_id FROM discord_bot_identities WHERE token_invalidated_at IS NULL`,
        )
        .all() as BotIdentityRow[];
    const out: BotIdentityDecrypted[] = [];
    for (const r of rows) {
        const token = await resolveIdentityToken(r, masterKey);
        if (!token) continue;
        out.push(rowToDecryptedIdentity(r, token));
    }
    return out;
}
