import { statSync } from "node:fs";
import logger from "@clansocket/logger";
import { getClanDb, getRosterPluginPresence } from "../database/index.js";
import { findIconAtPrefix, findIconPath, ICON_PREFIX_CUSTOMIZED, readTransformSidecar } from "./icon/filesystem.js";

export interface ClanRow {
    id: string;
    slug: string;
    display_name: string;
    status: string;
    icon_kind: string | null;
    icon_value: string | null;
    color: string | null;
    created_at: number;
}

interface RosterRow {
    fingerprint: string;
    captured_at: number;
    member_count: number;
    members_json: string;
}

export interface ManagedRosterMember {
    name: string;
    rank: string | null;
    joinedAt: string | null;
    accountHash?: string | null;
    hasPlugin?: boolean;
    isLive?: boolean;
}

export interface ManagedRoster {
    fingerprint: string;
    capturedAt: number;
    memberCount: number;
    members: ManagedRosterMember[];
}

export interface ManagedClanView {
    id: string;
    slug: string;
    displayName: string;
    status: string;
    role: string;
    grantedVia: string;
    grantedAt: number;
    createdAt: number;
    iconKind: string | null;
    iconValue: string | null;
    iconCustomized: boolean;
    iconTransform: ReturnType<typeof readTransformSidecar> | null;
    iconVersion: number;
    color: string | null;
    roster: ManagedRoster | null;
}

export function iconVersionFor(clanId: string, iconKind: string | null): number {
    const found = iconKind === "image" ? findIconPath(clanId) : null;
    if (found === null) return 0;
    try {
        return Math.floor(statSync(found.path).mtimeMs);
    } catch {
        return 0;
    }
}

export function readClanRoster(clanId: string): ManagedRoster | null {
    try {
        const row = getClanDb(clanId)
            .prepare(
                `SELECT fingerprint, captured_at, member_count, members_json
                 FROM clan_rosters ORDER BY captured_at DESC LIMIT 1`,
            )
            .get() as RosterRow | undefined;
        if (!row) return null;
        const members = JSON.parse(row.members_json) as ManagedRosterMember[];
        const presence = getRosterPluginPresence(clanId, members);
        for (const m of members) {
            const p = presence.get(m.name.toLowerCase());
            m.hasPlugin = p?.hasPlugin === true;
            m.isLive = p?.isLive === true;
        }
        return {
            fingerprint: row.fingerprint,
            capturedAt: row.captured_at,
            memberCount: row.member_count,
            members,
        };
    } catch (err) {
        logger.error(`[clansocket_clans] roster lookup failed for ${clanId}: ${(err as Error).message}`);
        return null;
    }
}

export function buildClanView(r: ClanRow, role: string, grantedVia: string, grantedAt: number): ManagedClanView {
    const customized = findIconAtPrefix(r.id, ICON_PREFIX_CUSTOMIZED) !== null;
    return {
        id: r.id,
        slug: r.slug,
        displayName: r.display_name,
        status: r.status,
        role,
        grantedVia,
        grantedAt,
        createdAt: r.created_at,
        iconKind: r.icon_kind,
        iconValue: r.icon_value,
        iconCustomized: customized,
        iconTransform: customized ? readTransformSidecar(r.id) : null,
        iconVersion: iconVersionFor(r.id, r.icon_kind),
        color: r.color,
        roster: readClanRoster(r.id),
    };
}
