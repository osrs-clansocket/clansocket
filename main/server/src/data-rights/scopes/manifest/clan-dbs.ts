import type { ChildTable, ClanScopedUserTable } from "./types.js";

export const CLAN_DB_USER_TABLES: ClanScopedUserTable[] = [
    { table: "clan_accounts", column: "account_hash", action: "delete" },
    { table: "clan_rosters", column: "captured_by_account_hash", action: "null" },
    { table: "clan_chats", column: "account_hash", action: "delete" },
    { table: "clan_member_history", column: "account_hash", action: "delete" },
    { table: "clan_snapshots", column: "account_hash", action: "delete" },
    { table: "clan_titles_current", column: "account_hash", action: "delete" },
    { table: "clan_titles_history", column: "account_hash", action: "delete" },
];

// Per-clan tables in clan.db keyed by site_account_id. (clan_audit.db has its own list below.)
export const CLAN_DB_SITE_ACCOUNT_TABLES: ClanScopedUserTable[] = [
    { table: "clan_invite_redemptions", column: "redeemed_by_site_account_id", action: "delete" },
    { table: "clan_invites", column: "created_by_site_account_id", action: "null" },
];

// Per-clan-audit.db tables keyed by site_account_id. Anonymize on user delete
// rather than cascade — preserves the clan's record of what happened, drops the actor identifier.
export const CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES: ClanScopedUserTable[] = [
    { table: "clan_audit_log", column: "actor_site_account_id", action: "null" },
];

// discord_guild_<guild_id>.db (per-clan-per-guild) — user-keyed rows.
// Iterated WITHIN the per-clan loop alongside clan.db / clan_audit.db / plugin-*.db,
// looping over each (clan_id, guild_id) pair surfaced by listDiscordGuildIdsForClan.
// discord_webhook_tokens excludes encrypted_token cols — credential material, not user content.
export const DISCORD_GUILD_DB_SITE_ACCOUNT_TABLES: ClanScopedUserTable[] = [
    { table: "discord_capabilities", column: "toggled_by_site_account_id", action: "delete" },
    { table: "discord_managed_namespace", column: "tagged_by_site_account_id", action: "delete" },
    { table: "discord_message_templates", column: "created_by_site_account_id", action: "delete" },
    { table: "discord_resource_customizations", column: "created_by_site_account_id", action: "delete" },
    { table: "discord_draft_sessions", column: "owner_site_account_id", action: "delete" },
    { table: "discord_presets", column: "created_by_site_account_id", action: "delete" },
    { table: "discord_preset_applications", column: "applied_by_site_account_id", action: "delete" },
    {
        table: "discord_webhook_tokens",
        column: "bound_by_site_account_id",
        action: "delete",
        excludeColumns: ["encrypted_token_b64", "token_iv_b64", "token_key_id"],
    },
];

// Children of user-owned parents in discord_guild_<guild_id>.db.
// Cascade-include on collect; cascade-delete (children-before-parents) on purge.
// Each entry: child rows where child.parentColumn IN (SELECT parent.parentKey FROM parentTable WHERE owner = user).
export const DISCORD_GUILD_CHILD_TABLES: ChildTable[] = [
    {
        table: "discord_draft_changes",
        parentTable: "discord_draft_sessions",
        parentColumn: "session_id",
        parentKey: "session_id",
    },
    {
        table: "discord_draft_publish_queue",
        parentTable: "discord_draft_sessions",
        parentColumn: "session_id",
        parentKey: "session_id",
    },
    {
        table: "discord_draft_change_deps",
        parentTable: "discord_draft_changes",
        parentColumn: "change_id",
        parentKey: "change_id",
    },
    {
        table: "discord_preset_resources",
        parentTable: "discord_presets",
        parentColumn: "preset_id",
        parentKey: "preset_id",
    },
];
