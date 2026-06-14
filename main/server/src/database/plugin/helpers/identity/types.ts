export interface PluginIdentityRecord {
    accountHash: string;
    rsn: string;
    accountType?: string | null;
    world: number;
    mode: string;
    activity?: string | null;
    clanName?: string | null;
    clanRank?: string | null;
    clanJoinedAt?: string | null;
    clanMemberCount?: number | null;
    clanOnlineCount?: number | null;
    worldTypes?: string[];
    pluginVersion?: string;
    schemaVersion?: number;
}
