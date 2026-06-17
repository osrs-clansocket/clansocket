import { signal } from "../../dom/factory";
import {
    openChannelsStream,
    openMembersStream,
    openRolesStream,
    type DiscordChannel,
    type DiscordMember,
    type DiscordRole,
} from "./client.js";

const guildDataVersionSignal = signal<number>(0);

interface GuildCache {
    channels: Map<string, DiscordChannel>;
    roles: Map<string, DiscordRole>;
    members: Map<string, DiscordMember>;
}

const caches = new Map<string, GuildCache>();
const subscribed = new Set<string>();

function bumpVersion(): void {
    guildDataVersionSignal.set(guildDataVersionSignal() + 1);
}

function emptyCache(): GuildCache {
    return {
        channels: new Map(),
        roles: new Map(),
        members: new Map(),
    };
}

function subscribeChannels(guildId: string, cache: GuildCache): void {
    openChannelsStream(
        guildId,
        (snap) => {
            cache.channels.clear();
            for (const row of snap.rows as DiscordChannel[]) cache.channels.set(row.channel_id, row);
            bumpVersion();
        },
        (batch) => {
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) cache.channels.set(d.key, d.row as DiscordChannel);
                else if (d.op === "remove") cache.channels.delete(d.key);
            }
            bumpVersion();
        },
    );
}

function subscribeRoles(guildId: string, cache: GuildCache): void {
    openRolesStream(
        guildId,
        (snap) => {
            cache.roles.clear();
            for (const row of snap.rows as DiscordRole[]) cache.roles.set(row.role_id, row);
            bumpVersion();
        },
        (batch) => {
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) cache.roles.set(d.key, d.row as DiscordRole);
                else if (d.op === "remove") cache.roles.delete(d.key);
            }
            bumpVersion();
        },
    );
}

function subscribeMembers(guildId: string, cache: GuildCache): void {
    openMembersStream(
        guildId,
        (snap) => {
            cache.members.clear();
            for (const row of snap.rows as DiscordMember[]) cache.members.set(row.user_id, row);
            bumpVersion();
        },
        (batch) => {
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) cache.members.set(d.key, d.row as DiscordMember);
                else if (d.op === "remove") cache.members.delete(d.key);
            }
            bumpVersion();
        },
    );
}

function ensureCache(guildId: string): GuildCache {
    let cache = caches.get(guildId);
    if (!cache) {
        cache = emptyCache();
        caches.set(guildId, cache);
    }
    if (!subscribed.has(guildId)) {
        subscribed.add(guildId);
        subscribeChannels(guildId, cache);
        subscribeRoles(guildId, cache);
        subscribeMembers(guildId, cache);
    }
    return cache;
}

export function guildDataVersion(): number {
    return guildDataVersionSignal();
}

export function getChannelInfo(guildId: string, channelId: string): DiscordChannel | null {
    return ensureCache(guildId).channels.get(channelId) ?? null;
}

export function getRoleInfo(guildId: string, roleId: string): DiscordRole | null {
    return ensureCache(guildId).roles.get(roleId) ?? null;
}

export function getMemberInfo(guildId: string, userId: string): DiscordMember | null {
    return ensureCache(guildId).members.get(userId) ?? null;
}

export function listChannels(guildId: string): readonly DiscordChannel[] {
    return [...ensureCache(guildId).channels.values()];
}

export function listRoles(guildId: string): readonly DiscordRole[] {
    return [...ensureCache(guildId).roles.values()];
}

export function listMembers(guildId: string): readonly DiscordMember[] {
    return [...ensureCache(guildId).members.values()];
}

export function channelNameOr(guildId: string, channelId: string, fallback: string): string {
    return getChannelInfo(guildId, channelId)?.name ?? fallback;
}

export function roleNameOr(guildId: string, roleId: string, fallback: string): string {
    return getRoleInfo(guildId, roleId)?.name ?? fallback;
}

export function memberDisplayOr(guildId: string, userId: string, fallback: string): string {
    const m = getMemberInfo(guildId, userId);
    if (!m) return fallback;
    return m.nickname ?? m.display_name ?? m.name;
}
