import { listVaultEntryKeys } from "../../../clan-vault/index.js";
import type { Actor } from "../../../clan-vault/shared/vault-types.js";
import { getClanOwnerSiteAccountId } from "../../../clansocket/auth/clan-owner-lookup.js";
import { getByoBotIdentityForClan } from "../../../database/discord/byo/get-byo-bot-identity.js";
import { loadServedGuildsFor, type ServedGuild } from "../../../database/discord/servers/list-served-guilds-for-bot.js";
import { getSiteAccountById } from "../../../database/index.js";

const ENTRY_KEY_DISCORD_BOT = "discord-bot";

export type ByoBotServedGuild = ServedGuild;

export interface ByoBotStatusRow {
    linked: boolean;
    bot_id?: string;
    username?: string | null;
    application_id?: string;
    last_verified_at?: number | null;
    last_verified_status?: string | null;
    owner_site_account_id?: string | null;
    owner_display_name?: string | null;
    clan_owner_site_account_id?: string | null;
    served_guilds?: ByoBotServedGuild[];
}

export async function buildByoBotStatusRow(clanId: string, actor: Actor): Promise<ByoBotStatusRow> {
    const identity = getByoBotIdentityForClan(clanId);
    if (!identity) return { linked: false };
    const entries = await listVaultEntryKeys(clanId, actor);
    const vaultEntry = entries.find((e) => e.entry_key === ENTRY_KEY_DISCORD_BOT) ?? null;
    const linkerSiteAccountId = identity.owner_site_account_id;
    const linkerAccount = linkerSiteAccountId ? getSiteAccountById(linkerSiteAccountId) : null;
    const clanOwnerSiteAccountId = getClanOwnerSiteAccountId(clanId);
    const served = loadServedGuildsFor(identity.bot_id);
    return {
        linked: true,
        bot_id: identity.bot_id,
        username: identity.bot_name,
        application_id: identity.application_id,
        last_verified_at: vaultEntry?.last_verified_at ?? null,
        last_verified_status: vaultEntry?.last_verified_status ?? null,
        owner_site_account_id: linkerSiteAccountId,
        owner_display_name: linkerAccount?.display_name ?? linkerSiteAccountId,
        clan_owner_site_account_id: clanOwnerSiteAccountId,
        served_guilds: served,
    };
}
