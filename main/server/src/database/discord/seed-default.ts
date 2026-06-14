import logger from "@clansocket/logger";
import { DB_NAMES } from "../core/database-state.js";
import { getDb } from "../core/database.js";

const RADIX_DECIMAL = 10;
const DEFAULT_BOT_ID = "clansocket-default";
const DEFAULT_BOT_NAME = "ClanSocket";
const DEFAULT_OWNER_KIND = "clansocket";

interface DefaultEnv {
    applicationId: string;
    publicKey: string;
    intentsBitfield: number;
}

function tryReadDefaultEnv(): DefaultEnv | null {
    const token = process.env.DISCORD_TOKEN;
    const applicationId = process.env.CLIENT_ID;
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    const intentsBitfield = process.env.DISCORD_INTENTS_BITFIELD;
    const missing: string[] = [];
    if (!token) missing.push("DISCORD_TOKEN");
    if (!applicationId) missing.push("CLIENT_ID");
    if (!publicKey) missing.push("DISCORD_PUBLIC_KEY");
    if (!intentsBitfield) missing.push("DISCORD_INTENTS_BITFIELD");
    if (missing.length > 0) {
        logger.warn(`[discord] seed-default skipped — missing env: ${missing.join(", ")}`);
        return null;
    }
    return {
        applicationId: applicationId!,
        publicKey: publicKey!,
        intentsBitfield: parseInt(intentsBitfield!, RADIX_DECIMAL),
    };
}

export function seedDefaultBotIdentity(): boolean {
    const db = getDb(DB_NAMES.DISCORD_BOT);
    const existing = db.prepare(`SELECT COUNT(*) AS c FROM discord_bot_identities`).get() as { c: number };
    if (existing.c > 0) return false;
    const env = tryReadDefaultEnv();
    if (!env) return false;
    const now = Date.now();
    db.prepare(
        `INSERT INTO discord_bot_identities (bot_id, bot_name, application_id, application_name, owner_kind, encrypted_token_b64, token_iv_b64, public_key, intents_bitfield, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
        DEFAULT_BOT_ID,
        DEFAULT_BOT_NAME,
        env.applicationId,
        DEFAULT_BOT_NAME,
        DEFAULT_OWNER_KIND,
        null,
        null,
        env.publicKey,
        env.intentsBitfield,
        now,
        now,
    );
    logger.info(`[discord] seed-default inserted clansocket-default identity`);
    return true;
}
