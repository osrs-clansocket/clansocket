import type { Guild } from "discord.js";
import type { GuildSettingsRow, WelcomeScreenChannel } from "../types.js";

interface WelcomeFetch {
    enabled: boolean;
    description: string | null;
    channels: WelcomeScreenChannel[];
}

const EMPTY_WELCOME: WelcomeFetch = { enabled: false, description: null, channels: [] };

async function fetchWelcomeChannels(guild: Guild): Promise<WelcomeFetch> {
    try {
        const ws = await guild.fetchWelcomeScreen();
        const channels: WelcomeScreenChannel[] = [...ws.welcomeChannels.values()].map((wc) => ({
            channel_id: wc.channelId,
            description: wc.description,
            emoji_id: wc.emoji?.id ?? null,
            emoji_name: wc.emoji?.name ?? null,
        }));
        return {
            enabled: ws.enabled,
            description: ws.description,
            channels,
        };
    } catch {
        return EMPTY_WELCOME;
    }
}

export async function extractGuildSettingsRow(guild: Guild): Promise<GuildSettingsRow> {
    const welcome = await fetchWelcomeChannels(guild);
    return {
        guild_id: guild.id,
        name: guild.name,
        icon_url: guild.iconURL(),
        banner_url: guild.bannerURL(),
        description: guild.description,
        system_channel_id: guild.systemChannelId,
        afk_channel_id: guild.afkChannelId,
        afk_timeout: guild.afkTimeout,
        verification_level: guild.verificationLevel,
        welcome_screen_enabled: welcome.enabled,
        welcome_screen_description: welcome.description,
        welcome_screen_channels: welcome.channels,
    };
}
