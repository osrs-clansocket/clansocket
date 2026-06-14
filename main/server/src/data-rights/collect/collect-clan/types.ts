export const APP_TABLES_BY_CLAN_ID = [
    { table: "clansocket_clans", column: "id" },
    { table: "clansocket_clan_managers", column: "clan_id" },
    { table: "clansocket_clan_manager_requests", column: "clan_id" },
    { table: "clansocket_clan_whitelists", column: "clan_id" },
];

export const ICON_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "ico"];
export const ICON_TRANSFORM_SIDECAR = "icon-customized.transform.json";

export interface ClanCollectionSummary {
    clanId: string;
    displayName: string;
    slug: string;
    status: string;
    exportedAt: number;
    appTables: Record<string, number>;
    clanDbTables: Record<string, number>;
    clanAuditDbTables: Record<string, number>;
    modes: Array<{ mode: string; tables: Record<string, number>; assets: number }>;
    icon: string | null;
}

export type ModeSummary = ClanCollectionSummary["modes"][number];
