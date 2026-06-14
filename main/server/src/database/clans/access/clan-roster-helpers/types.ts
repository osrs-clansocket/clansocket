export interface ClanRosterMember {
    name: string;
    rank: string | null;
    joinedAt: string | null;
    accountHash?: string | null;
}

export interface PluginPresence {
    hasPlugin: boolean;
    isLive: boolean;
}

export interface ClanRosterDiff {
    eventType: "member_joined" | "member_left" | "rank_changed";
    memberName: string;
    oldValue: string | null;
    newValue: string | null;
    detectedAt: number;
}
