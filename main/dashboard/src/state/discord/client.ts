import type { DeltaBatch, SnapshotBaseline } from "@clansocket/realtime";
import { sameOriginFetch } from "../../shared/helpers/fetch-helper.js";

export interface DiscordServer {
    guild_id: string;
    guild_name: string;
    bot_id: string;
    bot_name: string | null;
    installed_at: number;
    features: string;
}

export interface DiscordBotIdentity {
    bot_id: string;
    bot_name: string | null;
    application_id: string;
    application_name: string;
    owner_kind: string;
    owner_site_account_id: string | null;
    public_key: string;
    intents_bitfield: number;
    active_presence_template_id: string | null;
}

export interface DiscordChannel extends Record<string, unknown> {
    channel_id: string;
    guild_id: string;
    name: string | null;
    type: number;
    parent_id: string | null;
    position: number | null;
    topic: string | null;
    nsfw: boolean;
    rate_limit_per_user: number | null;
    bitrate: number | null;
    user_limit: number | null;
    thread_archived: boolean | null;
    thread_locked: boolean | null;
    thread_auto_archive_duration: number | null;
    thread_archive_timestamp: number | null;
    thread_message_count: number | null;
}

export interface DiscordChannelPin extends Record<string, unknown> {
    message_id: string;
    channel_id: string;
    guild_id: string;
    author_user_id: string | null;
    author_name: string | null;
    content: string | null;
    timestamp: number;
    attachments: string[];
}

export async function fetchDiscordChannelPins(guildId: string, channelId: string): Promise<DiscordChannelPin[]> {
    const url = `/api/discord/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(channelId)}/pins`;
    const res = await sameOriginFetch(url, { method: "GET" });
    if (!res.ok) return [];
    const body = (await res.json()) as { pins: DiscordChannelPin[] };
    return body.pins;
}

export interface DiscordRole extends Record<string, unknown> {
    role_id: string;
    guild_id: string;
    name: string;
    color: number;
    hoist: boolean;
    mentionable: boolean;
    position: number;
    permissions: string;
    managed: boolean;
    icon_url: string | null;
    unicode_emoji: string | null;
}

export function openDiscordServersStream(slug: string, onEvent: () => void): () => void {
    const url = `/api/discord/clans/${encodeURIComponent(slug)}/servers/stream`;
    const source = new EventSource(url);
    source.addEventListener("servers", onEvent);
    return () => source.close();
}

interface ProjectionFrame {
    snapshot?: SnapshotBaseline;
    topic?: string;
    fromSeq?: number;
    toSeq?: number;
    deltas?: unknown[];
}

function openProjectionStream(
    url: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    const source = new EventSource(url);
    source.addEventListener("message", (e) => {
        const msg = JSON.parse(e.data) as ProjectionFrame;
        if (msg.snapshot) {
            onSnapshot(msg.snapshot);
            return;
        }
        if (msg.topic !== undefined && msg.deltas !== undefined) onDelta(msg as DeltaBatch);
    });
    return () => source.close();
}

export function openChannelsStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(`/api/discord/channels/${encodeURIComponent(guildId)}/stream`, onSnapshot, onDelta);
}

export function openRolesStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(`/api/discord/roles/${encodeURIComponent(guildId)}/stream`, onSnapshot, onDelta);
}

export async function removeDiscordServer(slug: string, guildId: string): Promise<boolean> {
    const url = `/api/discord/clans/${encodeURIComponent(slug)}/servers/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, { method: "DELETE" });
    return res.ok;
}

export interface CreateChannelPayload {
    userId: string;
    name: string;
    channelType: number;
    parentId?: string | null;
    topic?: string | null;
    nsfw?: boolean;
    rateLimitPerUser?: number;
}

export interface CreateChannelResult {
    sessionId: string;
    changeId: string;
    queueId: string;
    tempId: string;
}

export async function createDiscordChannel(
    guildId: string,
    payload: CreateChannelPayload,
): Promise<CreateChannelResult | { error: string }> {
    const url = `/api/discord/channels/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) return { error: `http_${res.status}` };
    return (await res.json()) as CreateChannelResult;
}

export interface DeleteChannelPayload {
    userId: string;
    channelName: string;
    channelType: number;
}

export async function deleteDiscordChannel(
    guildId: string,
    channelId: string,
    payload: DeleteChannelPayload,
): Promise<boolean> {
    const url = `/api/discord/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(channelId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DeleteRolePayload {
    userId: string;
    roleName: string;
}

export async function deleteDiscordRole(guildId: string, roleId: string, payload: DeleteRolePayload): Promise<boolean> {
    const url = `/api/discord/roles/${encodeURIComponent(guildId)}/${encodeURIComponent(roleId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DiscordChannelState {
    name: string;
    topic?: string | null;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    parentId?: string | null;
}

export interface UpdateChannelPayload {
    userId: string;
    before: DiscordChannelState;
    after: DiscordChannelState;
}

export async function updateDiscordChannel(
    guildId: string,
    channelId: string,
    payload: UpdateChannelPayload,
): Promise<boolean> {
    const url = `/api/discord/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(channelId)}`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface CreateRolePayload {
    userId: string;
    name: string;
    color?: number;
    hoist?: boolean;
    mentionable?: boolean;
    permissions?: string;
}

export async function createDiscordRole(guildId: string, payload: CreateRolePayload): Promise<boolean> {
    const url = `/api/discord/roles/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DiscordRoleState {
    name: string;
    color: number;
    hoist?: boolean;
    mentionable?: boolean;
    permissions: string;
}

export interface UpdateRolePayload {
    userId: string;
    before: DiscordRoleState;
    after: DiscordRoleState;
}

export async function updateDiscordRole(guildId: string, roleId: string, payload: UpdateRolePayload): Promise<boolean> {
    const url = `/api/discord/roles/${encodeURIComponent(guildId)}/${encodeURIComponent(roleId)}`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DiscordMember extends Record<string, unknown> {
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
    pending: boolean;
    flags: string;
}

export function openMembersStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(`/api/discord/members/${encodeURIComponent(guildId)}/stream`, onSnapshot, onDelta);
}

export interface SetNicknamePayload {
    userId: string;
    targetUserId: string;
    targetUserName: string;
    beforeNickname: string | null;
    nickname: string | null;
}

export async function setDiscordMemberNickname(guildId: string, payload: SetNicknamePayload): Promise<boolean> {
    const url = `/api/discord/members/${encodeURIComponent(guildId)}/${encodeURIComponent(payload.targetUserId)}/nickname`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface KickMemberPayload {
    userId: string;
    targetUserName: string;
    reason?: string;
}

export async function kickDiscordMember(
    guildId: string,
    targetUserId: string,
    payload: KickMemberPayload,
): Promise<boolean> {
    const url = `/api/discord/members/${encodeURIComponent(guildId)}/${encodeURIComponent(targetUserId)}/kick`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DiscordWebhook extends Record<string, unknown> {
    webhook_id: string;
    guild_id: string;
    channel_id: string;
    name: string | null;
    avatar_url: string | null;
    application_id: string | null;
    user_id: string | null;
    webhook_type: number;
    source_guild_id: string | null;
    source_guild_name: string | null;
    source_channel_id: string | null;
    source_channel_name: string | null;
}

export interface DiscordWebhookState {
    name: string | null;
    channelId: string;
    avatarUrl?: string | null;
}

export function openWebhooksStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(`/api/discord/webhooks/${encodeURIComponent(guildId)}/stream`, onSnapshot, onDelta);
}

export interface CreateWebhookPayload {
    userId: string;
    channelId: string;
    name: string;
    avatarUrl?: string | null;
}

export async function createDiscordWebhook(guildId: string, payload: CreateWebhookPayload): Promise<boolean> {
    const url = `/api/discord/webhooks/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface UpdateWebhookPayload {
    userId: string;
    before: DiscordWebhookState;
    after: DiscordWebhookState;
}

export async function updateDiscordWebhook(
    guildId: string,
    webhookId: string,
    payload: UpdateWebhookPayload,
): Promise<boolean> {
    const url = `/api/discord/webhooks/${encodeURIComponent(guildId)}/${encodeURIComponent(webhookId)}`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DeleteWebhookPayload {
    userId: string;
    targetName: string;
    channelId: string;
}

export async function deleteDiscordWebhook(
    guildId: string,
    webhookId: string,
    payload: DeleteWebhookPayload,
): Promise<boolean> {
    const url = `/api/discord/webhooks/${encodeURIComponent(guildId)}/${encodeURIComponent(webhookId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DiscordServerEmoji extends Record<string, unknown> {
    emoji_id: string;
    guild_id: string;
    name: string;
    role_ids: string[];
    animated: boolean;
    available: boolean;
    managed: boolean;
    image_url: string | null;
    user_id: string | null;
}

export function openServerEmojisStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(
        `/api/discord/server-emojis/${encodeURIComponent(guildId)}/stream`,
        onSnapshot,
        onDelta,
    );
}

export interface CreateServerEmojiPayload {
    userId: string;
    name: string;
    imageDataUrl: string;
    animated: boolean;
    roleIds?: readonly string[];
}

export async function createDiscordServerEmoji(guildId: string, payload: CreateServerEmojiPayload): Promise<boolean> {
    const url = `/api/discord/server-emojis/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface UpdateServerEmojiPayload {
    userId: string;
    beforeName: string;
    name: string;
    roleIds?: readonly string[];
}

export async function updateDiscordServerEmoji(
    guildId: string,
    emojiId: string,
    payload: UpdateServerEmojiPayload,
): Promise<boolean> {
    const url = `/api/discord/server-emojis/${encodeURIComponent(guildId)}/${encodeURIComponent(emojiId)}`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DeleteServerEmojiPayload {
    userId: string;
    targetName: string;
}

export async function deleteDiscordServerEmoji(
    guildId: string,
    emojiId: string,
    payload: DeleteServerEmojiPayload,
): Promise<boolean> {
    const url = `/api/discord/server-emojis/${encodeURIComponent(guildId)}/${encodeURIComponent(emojiId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DiscordServerSticker extends Record<string, unknown> {
    sticker_id: string;
    guild_id: string;
    name: string;
    description: string | null;
    tags: string | null;
    format_type: number;
    available: boolean;
    image_url: string | null;
    user_id: string | null;
}

export function openServerStickersStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(
        `/api/discord/server-stickers/${encodeURIComponent(guildId)}/stream`,
        onSnapshot,
        onDelta,
    );
}

export interface CreateServerStickerPayload {
    userId: string;
    name: string;
    description?: string | null;
    tags?: string | null;
    imageDataUrl: string;
    formatType?: number;
}

export async function createDiscordServerSticker(
    guildId: string,
    payload: CreateServerStickerPayload,
): Promise<boolean> {
    const url = `/api/discord/server-stickers/${encodeURIComponent(guildId)}`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface UpdateServerStickerPayload {
    userId: string;
    beforeName: string;
    name: string;
    description?: string | null;
    tags?: string | null;
}

export async function updateDiscordServerSticker(
    guildId: string,
    stickerId: string,
    payload: UpdateServerStickerPayload,
): Promise<boolean> {
    const url = `/api/discord/server-stickers/${encodeURIComponent(guildId)}/${encodeURIComponent(stickerId)}`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DeleteServerStickerPayload {
    userId: string;
    targetName: string;
}

export async function deleteDiscordServerSticker(
    guildId: string,
    stickerId: string,
    payload: DeleteServerStickerPayload,
): Promise<boolean> {
    const url = `/api/discord/server-stickers/${encodeURIComponent(guildId)}/${encodeURIComponent(stickerId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface WelcomeScreenChannel {
    channel_id: string;
    description: string;
    emoji_id: string | null;
    emoji_name: string | null;
}

export interface DiscordGuildSettings extends Record<string, unknown> {
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
    welcome_screen_channels_json: string;
}

export function openGuildSettingsStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(
        `/api/discord/guild-settings/${encodeURIComponent(guildId)}/stream`,
        onSnapshot,
        onDelta,
    );
}

export interface SetGuildNamePayload {
    userId: string;
    beforeName: string;
    name: string;
}

export async function setDiscordGuildName(guildId: string, payload: SetGuildNamePayload): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/name`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface SetGuildIconPayload {
    userId: string;
    guildName: string;
    beforeIconUrl: string | null;
    iconDataUrl: string | null;
    afterIconUrl: string | null;
}

export async function setDiscordGuildIcon(guildId: string, payload: SetGuildIconPayload): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/icon`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface SetGuildBannerPayload {
    userId: string;
    guildName: string;
    beforeBannerUrl: string | null;
    bannerDataUrl: string | null;
    afterBannerUrl: string | null;
}

export async function setDiscordGuildBanner(guildId: string, payload: SetGuildBannerPayload): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/banner`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface SetGuildDescriptionPayload {
    userId: string;
    guildName: string;
    beforeDescription: string | null;
    description: string | null;
}

export async function setDiscordGuildDescription(
    guildId: string,
    payload: SetGuildDescriptionPayload,
): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/description`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface SetGuildSystemChannelPayload {
    userId: string;
    guildName: string;
    beforeChannelId: string | null;
    channelId: string | null;
}

export async function setDiscordGuildSystemChannel(
    guildId: string,
    payload: SetGuildSystemChannelPayload,
): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/system-channel`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface SetGuildAfkPayload {
    userId: string;
    guildName: string;
    beforeAfkChannelId: string | null;
    afkChannelId: string | null;
    beforeAfkTimeout: number | null;
    afkTimeout: number | null;
}

export async function setDiscordGuildAfk(guildId: string, payload: SetGuildAfkPayload): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/afk`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface SetGuildVerificationLevelPayload {
    userId: string;
    guildName: string;
    beforeLevel: number;
    level: number;
}

export async function setDiscordGuildVerificationLevel(
    guildId: string,
    payload: SetGuildVerificationLevelPayload,
): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/verification-level`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface SetGuildWelcomeScreenPayload {
    userId: string;
    guildName: string;
    enabled: boolean;
    description?: string | null;
    welcomeChannels?: WelcomeScreenChannel[];
}

export async function setDiscordGuildWelcomeScreen(
    guildId: string,
    payload: SetGuildWelcomeScreenPayload,
): Promise<boolean> {
    const url = `/api/discord/guild-settings/${encodeURIComponent(guildId)}/welcome-screen`;
    const res = await sameOriginFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DiscordChannelOverwriteRole extends Record<string, unknown> {
    kind: "role";
    channel_id: string;
    role_id: string;
    guild_id: string;
    allow: string;
    deny: string;
}

export interface DiscordChannelOverwriteMember extends Record<string, unknown> {
    kind: "member";
    channel_id: string;
    user_id: string;
    guild_id: string;
    allow: string;
    deny: string;
}

export type DiscordChannelOverwrite = DiscordChannelOverwriteRole | DiscordChannelOverwriteMember;

export function openChannelOverwritesStream(
    guildId: string,
    onSnapshot: (snap: SnapshotBaseline) => void,
    onDelta: (batch: DeltaBatch) => void,
): () => void {
    return openProjectionStream(
        `/api/discord/channel-overwrites/${encodeURIComponent(guildId)}/stream`,
        onSnapshot,
        onDelta,
    );
}

export interface SetChannelPermissionsPayload {
    userId: string;
    channelName: string;
    overwriteKind: "role" | "member";
    overwriteTargetId: string;
    overwriteTargetName: string;
    allow: string;
    deny: string;
}

export async function setDiscordChannelPermissions(
    guildId: string,
    channelId: string,
    payload: SetChannelPermissionsPayload,
): Promise<boolean> {
    const url = `/api/discord/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(channelId)}/permissions`;
    const res = await sameOriginFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}

export interface DeleteChannelPermissionsPayload {
    userId: string;
    targetName: string;
    overwriteKind: "role" | "member";
    overwriteTargetId: string;
    overwriteTargetName: string;
}

export async function deleteDiscordChannelPermissions(
    guildId: string,
    channelId: string,
    overwriteTargetId: string,
    payload: DeleteChannelPermissionsPayload,
): Promise<boolean> {
    const url = `/api/discord/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(channelId)}/permissions/${encodeURIComponent(overwriteTargetId)}`;
    const res = await sameOriginFetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.ok;
}
