import type { Client } from "discord.js";

export interface BotIdentity {
    bot_id: string;
    bot_name: string | null;
    application_id: string;
    application_name: string;
    owner_kind: string;
    owner_site_account_id: string | null;
    token: string;
    public_key: string;
    intents_bitfield: number;
    active_presence_template_id: string | null;
}

export interface BotState {
    identity: BotIdentity;
    client: Client;
}

export interface BotContext {
    botId: string;
    clanId: string;
    guildId: string;
}
