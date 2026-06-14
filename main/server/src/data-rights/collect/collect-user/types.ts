export interface ZipEntry {
    path: string;
    json?: unknown;
    buffer?: Buffer;
}

export interface UserCollectionSummary {
    accountHash: string;
    siteAccountId: string;
    exportedAt: number;
    appTables: Record<string, number>;
    discordTables: Record<string, number>;
    clans: Array<{
        clanId: string;
        displayName: string;
        slug: string;
        status: string;
        clanDbTables: Record<string, number>;
        modes: Array<{
            mode: string;
            tables: Record<string, number>;
            assets: number;
        }>;
    }>;
}

export interface ClanRowLite {
    id: string;
    slug: string;
    display_name: string;
    status: string;
}

export type ClanSummary = UserCollectionSummary["clans"][number];
export type ModeSummary = ClanSummary["modes"][number];
