export interface ChannelRow {
    channel_id: string;
    guild_id: string;
    name: string | null;
    type: number;
    parent_id: string | null;
    position: number | null;
    topic: string | null;
    nsfw: boolean;
}

export interface RoleRow {
    role_id: string;
    guild_id: string;
    name: string;
    color: number;
    hoist: boolean;
    mentionable: boolean;
    position: number;
    permissions: string;
    managed: boolean;
}

export interface MemberRow {
    user_id: string;
    guild_id: string;
    name: string;
    display_name: string | null;
    nickname: string | null;
    joined_at: number | null;
    premium_since: number | null;
    communication_disabled_until: number | null;
    is_boosting: boolean;
    is_bot: boolean;
    role_ids: string[];
    avatar_url: string | null;
}

export interface WebhookRow {
    webhook_id: string;
    guild_id: string;
    channel_id: string;
    name: string | null;
    avatar_url: string | null;
    application_id: string | null;
    user_id: string | null;
    webhook_type: number;
}

export interface ServerEmojiRow {
    emoji_id: string;
    guild_id: string;
    name: string;
    role_ids: string[];
    animated: boolean;
    available: boolean;
    managed: boolean;
    image_url: string | null;
}

export interface ServerStickerRow {
    sticker_id: string;
    guild_id: string;
    name: string;
    description: string | null;
    tags: string | null;
    format_type: number;
    available: boolean;
    image_url: string | null;
}

export interface WelcomeScreenChannel {
    channel_id: string;
    description: string;
    emoji_id: string | null;
    emoji_name: string | null;
}

export interface GuildSettingsRow {
    guild_id: string;
    name: string;
    icon_url: string | null;
    banner_url: string | null;
    description: string | null;
    system_channel_id: string | null;
    afk_channel_id: string | null;
    afk_timeout: number | null;
    verification_level: number;
    welcome_screen_enabled: boolean;
    welcome_screen_description: string | null;
    welcome_screen_channels: WelcomeScreenChannel[];
}

export interface ChannelRoleOverwriteRow {
    channel_id: string;
    role_id: string;
    guild_id: string;
    allow: string;
    deny: string;
}

export interface ChannelMemberOverwriteRow {
    channel_id: string;
    user_id: string;
    guild_id: string;
    allow: string;
    deny: string;
}

export type ChannelOverwriteRow =
    | ({ kind: "role" } & ChannelRoleOverwriteRow)
    | ({ kind: "member" } & ChannelMemberOverwriteRow);
