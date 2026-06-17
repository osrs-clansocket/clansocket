import { setDiscordChannelPermissions, type DiscordChannelOverwrite } from "../../../../state/discord/client.js";
import { channelNameOr, memberDisplayOr, roleNameOr } from "../../../../state/discord/guild-state-cache.js";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import {
    PERMISSION_STATE_ALLOW,
    PERMISSION_STATE_DENY,
    PERMISSION_STATE_INHERIT,
} from "../../../../shared/constants/clan-manage-discord/permission-flags-constants.js";

export function safeBigInt(s: string): bigint {
    if (s.length === 0) return 0n;
    try {
        return BigInt(s);
    } catch {
        return 0n;
    }
}

export function formatPermissionName(name: string): string {
    if (name.length === 0) return name;
    const parts: string[] = [];
    let current = name[0];
    for (let i = 1; i < name.length; i++) {
        const c = name[i];
        if (c >= "A" && c <= "Z") {
            parts.push(current);
            current = c;
        } else {
            current += c;
        }
    }
    parts.push(current);
    return parts.join(" ");
}

export async function clearTargetFromPermission(
    existing: readonly DiscordChannelOverwrite[],
    kind: "role" | "member",
    targetId: string,
    bit: number,
): Promise<void> {
    const mask = 1n << BigInt(bit);
    for (const o of existing) {
        if (o.kind !== kind || targetIdOf(o) !== targetId) continue;
        const combined = safeBigInt(o.allow) | safeBigInt(o.deny);
        if ((combined & mask) === 0n) continue;
        await clearPermissionBit(o, bit);
    }
}

export async function clearChannelFromPermission(
    existing: readonly DiscordChannelOverwrite[],
    channelId: string,
    bit: number,
): Promise<void> {
    const mask = 1n << BigInt(bit);
    for (const o of existing) {
        if (o.channel_id !== channelId) continue;
        const combined = safeBigInt(o.allow) | safeBigInt(o.deny);
        if ((combined & mask) === 0n) continue;
        await clearPermissionBit(o, bit);
    }
}

export function tristateFor(allow: string, deny: string, bit: number): string {
    const mask = 1n << BigInt(bit);
    if ((safeBigInt(allow) & mask) !== 0n) return PERMISSION_STATE_ALLOW;
    if ((safeBigInt(deny) & mask) !== 0n) return PERMISSION_STATE_DENY;
    return PERMISSION_STATE_INHERIT;
}

const STATE_ICON: Record<string, string> = {
    [PERMISSION_STATE_ALLOW]: "check-lg",
    [PERMISSION_STATE_DENY]: "x-lg",
    [PERMISSION_STATE_INHERIT]: "dash",
};

const FALLBACK_ICON = "dash";

export function iconNameForState(state: string): string {
    return STATE_ICON[state] ?? FALLBACK_ICON;
}

const STATE_MODIFIER: Record<string, string> = {
    [PERMISSION_STATE_ALLOW]: "allow",
    [PERMISSION_STATE_DENY]: "deny",
    [PERMISSION_STATE_INHERIT]: "inherit",
};

const FALLBACK_MODIFIER = "inherit";

export function modifierForState(state: string): string {
    return STATE_MODIFIER[state] ?? FALLBACK_MODIFIER;
}

export function targetIdOf(o: DiscordChannelOverwrite): string {
    return o.kind === "role" ? o.role_id : o.user_id;
}

export function targetNameOf(o: DiscordChannelOverwrite): string {
    const tid = targetIdOf(o);
    return o.kind === "role" ? roleNameOr(o.guild_id, tid, tid) : memberDisplayOr(o.guild_id, tid, tid);
}

export async function clearPermissionBit(o: DiscordChannelOverwrite, bit: number): Promise<boolean> {
    const session = identityStore.session$();
    if (session === null) return false;
    const mask = 1n << BigInt(bit);
    const newAllow = (safeBigInt(o.allow) & ~mask).toString();
    const newDeny = (safeBigInt(o.deny) & ~mask).toString();
    const tid = targetIdOf(o);
    return await setDiscordChannelPermissions(o.guild_id, o.channel_id, {
        userId: session.id,
        channelName: channelNameOr(o.guild_id, o.channel_id, o.channel_id),
        overwriteKind: o.kind,
        overwriteTargetId: tid,
        overwriteTargetName: targetNameOf(o),
        allow: newAllow,
        deny: newDeny,
    });
}

export async function addPermissionOverride(
    guildId: string,
    existing: readonly DiscordChannelOverwrite[],
    channelId: string,
    kind: "role" | "member",
    targetId: string,
    targetName: string,
    bit: number,
    branch: "allow" | "deny",
): Promise<boolean> {
    const session = identityStore.session$();
    if (session === null) return false;
    const mask = 1n << BigInt(bit);
    const match = existing.find((o) => o.channel_id === channelId && o.kind === kind && targetIdOf(o) === targetId);
    let allowBig = match ? safeBigInt(match.allow) : 0n;
    let denyBig = match ? safeBigInt(match.deny) : 0n;
    if (branch === "allow") {
        allowBig = allowBig | mask;
        denyBig = denyBig & ~mask;
    } else {
        denyBig = denyBig | mask;
        allowBig = allowBig & ~mask;
    }
    return await setDiscordChannelPermissions(guildId, channelId, {
        userId: session.id,
        channelName: channelNameOr(guildId, channelId, channelId),
        overwriteKind: kind,
        overwriteTargetId: targetId,
        overwriteTargetName: targetName,
        allow: allowBig.toString(),
        deny: denyBig.toString(),
    });
}

async function applyOverwriteState(
    o: DiscordChannelOverwrite,
    bit: number,
    state: "allow" | "deny" | "inherit",
): Promise<boolean> {
    const session = identityStore.session$();
    if (session === null) return false;
    const mask = 1n << BigInt(bit);
    let allowBig = safeBigInt(o.allow);
    let denyBig = safeBigInt(o.deny);
    if (state === "allow") {
        allowBig = allowBig | mask;
        denyBig = denyBig & ~mask;
    } else if (state === "deny") {
        allowBig = allowBig & ~mask;
        denyBig = denyBig | mask;
    } else {
        allowBig = allowBig & ~mask;
        denyBig = denyBig & ~mask;
    }
    const tid = targetIdOf(o);
    return await setDiscordChannelPermissions(o.guild_id, o.channel_id, {
        userId: session.id,
        channelName: channelNameOr(o.guild_id, o.channel_id, o.channel_id),
        overwriteKind: o.kind,
        overwriteTargetId: tid,
        overwriteTargetName: targetNameOf(o),
        allow: allowBig.toString(),
        deny: denyBig.toString(),
    });
}

function nextChipState(current: "allow" | "deny" | "mixed"): "allow" | "deny" {
    if (current === "allow") return "deny";
    return "allow";
}

export async function cycleTargetState(
    existing: readonly DiscordChannelOverwrite[],
    kind: "role" | "member",
    targetId: string,
    bit: number,
    currentState: "allow" | "deny" | "mixed",
): Promise<void> {
    const next = nextChipState(currentState);
    for (const o of existing) {
        if (o.kind !== kind || targetIdOf(o) !== targetId) continue;
        await applyOverwriteState(o, bit, next);
    }
}

export async function cycleChannelState(
    existing: readonly DiscordChannelOverwrite[],
    channelId: string,
    bit: number,
    currentState: "allow" | "deny" | "mixed",
): Promise<void> {
    const next = nextChipState(currentState);
    for (const o of existing) {
        if (o.channel_id !== channelId) continue;
        await applyOverwriteState(o, bit, next);
    }
}

export async function cyclePermission(o: DiscordChannelOverwrite, bit: number): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;

    const mask = 1n << BigInt(bit);
    const allowBig = safeBigInt(o.allow);
    const denyBig = safeBigInt(o.deny);
    const isAllow = (allowBig & mask) !== 0n;
    const isDeny = (denyBig & mask) !== 0n;

    let nextAllow: bigint;
    let nextDeny: bigint;
    if (!isAllow && !isDeny) {
        nextAllow = allowBig | mask;
        nextDeny = denyBig;
    } else if (isAllow) {
        nextAllow = allowBig & ~mask;
        nextDeny = denyBig | mask;
    } else {
        nextAllow = allowBig;
        nextDeny = denyBig & ~mask;
    }

    const tid = targetIdOf(o);
    await setDiscordChannelPermissions(o.guild_id, o.channel_id, {
        userId: session.id,
        channelName: channelNameOr(o.guild_id, o.channel_id, o.channel_id),
        overwriteKind: o.kind,
        overwriteTargetId: tid,
        overwriteTargetName: targetNameOf(o),
        allow: nextAllow.toString(),
        deny: nextDeny.toString(),
    });
}
