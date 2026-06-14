export interface PublicClanMember {
    name: string;
    rank: string | null;
    joinedAt: string | null;
    hasPlugin: boolean;
    isLive: boolean;
}

export interface PublicClanRoster {
    capturedAt: number;
    memberCount: number;
    members: PublicClanMember[];
}

export interface PublicClanResponse {
    slug: string;
    displayName: string;
    status: string;
    createdAt: number;
    claimedAt: number | null;
    roster: PublicClanRoster | null;
}

interface ProjectableClan {
    slug: string;
    display_name: string;
    status: string;
    created_at: number;
    claimed_at: number | null;
}

export function projectPublicClan(clan: ProjectableClan, roster: PublicClanRoster | null): PublicClanResponse {
    return {
        slug: clan.slug,
        displayName: clan.display_name,
        status: clan.status,
        createdAt: clan.created_at,
        claimedAt: clan.claimed_at,
        roster,
    };
}
