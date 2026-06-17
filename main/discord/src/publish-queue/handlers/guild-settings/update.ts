import type { Client } from "discord.js";
import type { PendingPublishRow } from "../../../loaders/publish-queue-loader.js";

const SUBJECT_NAME = "name";
const SUBJECT_ICON = "icon";
const SUBJECT_BANNER = "banner";
const SUBJECT_DESCRIPTION = "description";
const SUBJECT_SYSTEM_CHANNEL = "system-channel";
const SUBJECT_AFK = "afk";
const SUBJECT_WELCOME_SCREEN = "welcome-screen";
const SUBJECT_VERIFICATION_LEVEL = "verification-level";

interface WelcomeChannelInput {
    channelId: string;
    description: string;
    emoji?: string | null;
}

type UpdateState =
    | { subject: typeof SUBJECT_NAME; name: string }
    | { subject: typeof SUBJECT_ICON; iconDataUrl: string | null }
    | { subject: typeof SUBJECT_BANNER; bannerDataUrl: string | null }
    | { subject: typeof SUBJECT_DESCRIPTION; description: string | null }
    | { subject: typeof SUBJECT_SYSTEM_CHANNEL; channelId: string | null }
    | { subject: typeof SUBJECT_AFK; afkChannelId: string | null; afkTimeout: number | null }
    | {
          subject: typeof SUBJECT_WELCOME_SCREEN;
          enabled: boolean;
          description: string | null;
          welcomeChannels: WelcomeChannelInput[];
      }
    | { subject: typeof SUBJECT_VERIFICATION_LEVEL; level: number };

export async function updateGuildSettingsHandler(
    client: Client,
    row: PendingPublishRow,
): Promise<{ snowflakeResolved: null }> {
    if (!row.after_json) throw new Error("update requires after_json");
    const data = JSON.parse(row.after_json) as UpdateState;
    const guild = await client.guilds.fetch(row.guild_id);
    switch (data.subject) {
        case SUBJECT_NAME:
            await guild.setName(data.name);
            break;
        case SUBJECT_ICON:
            await guild.setIcon(data.iconDataUrl);
            break;
        case SUBJECT_BANNER:
            await guild.setBanner(data.bannerDataUrl);
            break;
        case SUBJECT_DESCRIPTION:
            await guild.edit({ description: data.description });
            break;
        case SUBJECT_SYSTEM_CHANNEL:
            await guild.edit({ systemChannel: data.channelId });
            break;
        case SUBJECT_AFK:
            await guild.edit({
                afkChannel: data.afkChannelId,
                afkTimeout: data.afkTimeout ?? undefined,
            });
            break;
        case SUBJECT_WELCOME_SCREEN:
            await guild.editWelcomeScreen({
                enabled: data.enabled,
                description: data.description ?? undefined,
                welcomeChannels: data.welcomeChannels.map((wc) => ({
                    channel: wc.channelId,
                    description: wc.description,
                    emoji: wc.emoji ?? undefined,
                })),
            });
            break;
        case SUBJECT_VERIFICATION_LEVEL:
            await guild.setVerificationLevel(data.level);
            break;
        default:
            throw new Error(`unsupported guild-settings subject: ${(data as { subject: string }).subject}`);
    }
    return { snowflakeResolved: null };
}
