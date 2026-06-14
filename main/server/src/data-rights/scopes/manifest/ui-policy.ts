// Columns always rendered behind a blur+reveal toggle in the /data-rights browser,
// regardless of which table they appear in. Names match across the schema.
// This is a UI-display concern only — values are still in the row payload.
export const GLOBAL_SECRET_COLUMNS: readonly string[] = [
    // identifiers
    "account_hash",
    "target_account_hash",
    "declared_account_hash",
    "owner_account_hash",
    "captured_by_account_hash",
    "site_account_id",
    "requesting_site_account_id",
    "actor_site_account_id",
    "owner_site_account_id",
    "redeemed_by_site_account_id",
    "created_by_site_account_id",
    "provider_user_id",
    "credential_id",
    "user_id",
    // roster / audit fingerprints
    "fingerprint",
    "from_fingerprint",
    "to_fingerprint",
    // audit payload (may contain row snapshots)
    "target_id",
    "payload",
    "payload_json",
];

// Read-only in /data-rights UI: visible + in export + wiped on leave-site, but NOT
// row/bulk-deletable via the UI. Reason: deletion would let users bypass rate limits,
// hide destructive actions, sabotage auth flows, or corrupt clan ownership/role state.
// Account-level erasure goes through the Leave-Site flow (which logs out + wipes everything).
// Per-row flows (cancel consent, revoke session, unlink provider, etc) live on their own surfaces.
export const READ_ONLY_BROWSE_TABLES: ReadonlySet<string> = new Set([
    // audit + integrity
    "clansocket_data_action_log",
    "clan_audit_log",
    // discord critical infrastructure (routing + credentials — never UI-deletable)
    "discord_servers",
    "discord_bot_identities",
    "discord_webhook_tokens",
    // auth / session state
    "clansocket_oauth_sessions",
    "clansocket_webauthn_challenges",
    "clansocket_passkeys",
    "clansocket_backup_codes",
    "clansocket_device_link_codes",
    // identity + bindings
    "clansocket_accounts",
    "clansocket_account_bindings",
    "clansocket_account_rsns",
    "clansocket_account_providers",
    // clan ownership + role
    "clansocket_clans",
    "clansocket_clan_managers",
    "clansocket_clan_manager_requests",
    "clansocket_clan_whitelists",
    // consent / flow state (cancel goes via the consent card, not row delete)
    "clansocket_consent_requests",
    // clan-internal config + roster snapshots (fair-play integrity)
    "clan_settings",
    "clan_eligibility_rules",
    "clan_rosters",
    "clan_invites",
    "clan_invite_redemptions",
]);
