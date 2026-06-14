export interface UserTableByColumn {
    table: string;
    column: string;
    excludeColumns?: string[];
    browseOrder?: string[];
}

export interface ClanScopedUserTable {
    table: string;
    column: string;
    action: "delete" | "null";
    excludeColumns?: readonly string[];
}

export interface ChildTable {
    table: string;
    parentTable: string;
    parentColumn: string;
    parentKey: string;
}

export interface AssetExtractor {
    table: string;
    blobColumn: string;
    idColumn: string;
    extColumn: string | null;
    defaultExt: string;
}
