export interface BotIdentityRow {
    bot_id: string;
    bot_name: string | null;
    application_id: string;
    application_name: string;
    owner_kind: string;
    owner_site_account_id: string | null;
    clan_id: string | null;
    clan_name: string | null;
    encrypted_token_b64: string | null;
    token_iv_b64: string | null;
    public_key: string | null;
    intents_bitfield: number;
    active_presence_template_id: string | null;
}

export interface BotIdentityDecrypted {
    bot_id: string;
    bot_name: string | null;
    application_id: string;
    application_name: string;
    owner_kind: string;
    owner_site_account_id: string | null;
    clan_id: string | null;
    clan_name: string | null;
    token: string;
    public_key: string | null;
    intents_bitfield: number;
    active_presence_template_id: string | null;
}

export interface RoutedServerRow {
    guild_id: string;
    guild_name: string;
    clan_id: string;
    clan_name: string;
    bot_id: string;
    bot_name: string | null;
    setup_status: string;
}
