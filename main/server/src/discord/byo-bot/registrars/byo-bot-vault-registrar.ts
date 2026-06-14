import { registerVaultEntryType } from "../../../clan-vault/index.js";
import { ClanAuditActions } from "../../../database/clans/audit/clan-audit-actions.js";
import { onByoBotCredentialsDeleted } from "../handlers/byo-deleted-handler.js";
import type { DiscordBotPayload } from "../types/byo-bot-types.js";
import { validateDiscordBotPayload } from "../validators/byo-bot-payload-validator.js";
import { verifyDiscordBotCredentials } from "../verifiers/byo-token-verifier.js";

const ENTRY_KEY_DISCORD_BOT = "discord-bot";
const ENTRY_TYPE_DISCORD_BOT = "discord-bot";
const SCHEMA_VERSION_V1 = 1;

export function registerByoBotVaultEntry(): void {
    registerVaultEntryType<DiscordBotPayload>({
        entry_key: ENTRY_KEY_DISCORD_BOT,
        entry_type: ENTRY_TYPE_DISCORD_BOT,
        schema_version: SCHEMA_VERSION_V1,
        validate: validateDiscordBotPayload,
        verify: async (payload) => (await verifyDiscordBotCredentials(payload)).status,
        onDelete: onByoBotCredentialsDeleted,
        auditActions: {
            read: ClanAuditActions.VaultDiscordBotRead,
            write: ClanAuditActions.VaultDiscordBotWrite,
            delete: ClanAuditActions.VaultDiscordBotDelete,
            verify: ClanAuditActions.VaultDiscordBotVerify,
        },
    });
}
