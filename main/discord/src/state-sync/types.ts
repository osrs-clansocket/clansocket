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
