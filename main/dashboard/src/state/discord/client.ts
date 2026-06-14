import type { DeltaBatch, SnapshotBaseline } from "@clansocket/realtime";
import { sameOriginFetch } from "../../shared/helpers/fetch-helper.js";

export interface DiscordServer {
    guild_id: string;
    guild_name: string;
    bot_id: string;
    bot_name: string;
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
