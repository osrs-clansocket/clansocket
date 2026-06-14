export interface ScopeListTable {
    name: string;
    hasRows: boolean;
}

export interface ScopeListItem {
    kind: "app" | "varez" | "discord" | "clan" | "clan_audit" | "plugin";
    label: string;
    clanId?: string;
    clanSlug?: string;
    mode?: string;
    tables: ScopeListTable[];
}

export interface ClanRow {
    id: string;
    slug: string;
    display_name: string;
}

export interface ClanPresence {
    clan: ClanRow;
    hasClanDb: boolean;
    hasAuditDb: boolean;
    presentModes: string[];
}
