import type { UserTableByColumn } from "./types.js";

export const APP_TABLES_BY_ACCOUNT_HASH: UserTableByColumn[] = [
    { table: "clansocket_account_bindings", column: "account_hash" },
    { table: "clansocket_account_rsns", column: "account_hash" },
    { table: "clansocket_clan_manager_requests", column: "declared_account_hash" },
    { table: "clansocket_clans", column: "owner_account_hash" },
];

export const APP_TABLES_BY_SITE_ACCOUNT: UserTableByColumn[] = [
    { table: "clansocket_oauth_sessions", column: "site_account_id", excludeColumns: ["id"] },
    { table: "clansocket_clan_manager_requests", column: "site_account_id" },
    { table: "clansocket_clan_managers", column: "site_account_id" },
    { table: "clansocket_passkeys", column: "site_account_id", excludeColumns: ["public_key"] },
    { table: "clansocket_device_link_codes", column: "site_account_id", excludeColumns: ["code"] },
    { table: "clansocket_backup_codes", column: "site_account_id", excludeColumns: ["code_hash"] },
    { table: "clansocket_account_providers", column: "site_account_id" },
    { table: "clansocket_data_action_log", column: "site_account_id" },
    { table: "clansocket_notifications", column: "site_account_id" },
    { table: "clansocket_consent_requests", column: "requesting_site_account_id" },
    { table: "clansocket_clans", column: "owner_site_account_id" },
    {
        table: "clansocket_webauthn_challenges",
        column: "site_account_id",
        excludeColumns: ["challenge", "link_code", "backup_code"],
    },
    { table: "clansocket_accounts", column: "id" },
];

// varez.db (AI subsystem) — user-scoped tables. Anything keyed by site_account_id.
// Globals (varez_state, varez_action_log) are untouched.
export const VAREZ_TABLES_BY_SITE_ACCOUNT: UserTableByColumn[] = [
    { table: "varez_chain_turns", column: "site_account_id" },
    { table: "varez_pins", column: "site_account_id" },
    { table: "varez_user_action_log", column: "site_account_id" },
];

// discord_bot.db (clansocket-default + BYO bot config) — user-keyed rows:
//   BYO bot ownership, presence template authorship, server install actions.
// Encrypted credentials (encrypted_token_b64 / token_iv_b64 / token_key_id)
// excluded from export — they're secrets, not user content.
export const DISCORD_BOT_TABLES_BY_SITE_ACCOUNT: UserTableByColumn[] = [
    {
        table: "discord_bot_identities",
        column: "owner_site_account_id",
        excludeColumns: ["encrypted_token_b64", "token_iv_b64", "token_key_id"],
    },
    { table: "discord_bot_presence_templates", column: "created_by_site_account_id" },
    { table: "discord_servers", column: "installer_site_account_id" },
];

// discord_bot.db — discord-user-id-keyed rows. Wiped only when the site_account
// was created via the discord provider (provider_user_id available).
export const DISCORD_BOT_TABLES_BY_DISCORD_USER_ID: UserTableByColumn[] = [
    { table: "discord_interactions_pending", column: "user_id" },
    { table: "discord_servers", column: "remover_user_id" },
];
